// npm
import * as PDFTableExtractor from 'pdf-table-extractor';
import * as _ from 'lodash';

// config
import { config } from "../config";

// service
import { CacheService } from "../services/cache.service";
import { DbService } from "../services/db.service";

// models
import { Building, BuildingRating } from "../models";

const seismicDegrees = ['RS1', 'RS2', 'RS3', 'RS4', 'CONSOLIDATED', 'EMERGENCY', 'NOT CLASSFIED']

async function loadData(): Promise<any> {
  return new Promise((resolve, reject) => {
    return PDFTableExtractor(
      './resources/risc_seismic_2020.pdf',
      data => resolve(data),
      err => reject(err),
    );
  })
}

async function dataImport(): Promise<any> {
  return loadData();
}

function cleanNumber(input: string) {
  const n = parseInt(input.replace(/[\.,\-]/gi, ''), 10)
  return isNaN(n) ? null : n
}

function getValues(table: any) {
  return {
    number: table[1],
    streetType: table[2],
    address: table[3].normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    addressNumber: table[4],
    district: table[5],
    apartmentNumber: cleanNumber(table[6]),
    heightRegime: table[7],
    yearOfConstruction: table[8],
    yearOfExpertise: table[9],
    surfaceSize: cleanNumber(table[10]),
    expertName: table[11],
    comments: table[12],
  };
}

(async () => {
  const dbService = new DbService(config.db)
  const cacheService = CacheService.getInstance(config.cache.redis)
  await cacheService.initialize();
  await dbService.initialize();


  let data = await cacheService.getCache('data');
  if (!data) {
    data = await dataImport();
    await cacheService.setCache('data', JSON.stringify(data))
  }

  const tables = _.reduce(data.pageTables, (r, pageTable) => r.concat(pageTable.tables), [])

  let seismicRating;
  let previousBuilding;
  for (const table of tables) {
    if (table[1] === 'Nr') {
      seismicRating = seismicDegrees.shift();
      continue;
    }
    if (seismicRating) {
      try {
        const buildingObject = getValues(table);
        if (new Set(table).size < 10) {
          Object.keys(buildingObject).forEach(key => [null, ''].includes(buildingObject[key]) && delete buildingObject[key]);
          Object.keys(buildingObject).forEach((key) => {
            previousBuilding[key] += buildingObject[key]
          });
          // noinspection JSUnusedAssignment
          previousBuilding.save()
        } else {
          previousBuilding = await Building.create(buildingObject)
          await BuildingRating.create({
            seismicRating,
            buildingId: previousBuilding.id,
          })
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  await cacheService.close();
})();


