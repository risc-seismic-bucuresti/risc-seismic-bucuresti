// npm
import * as PDFTableExtractor from 'pdf-table-extractor';
import * as _ from 'lodash';

// models
import { Building, BuildingRating } from '../models';

// helpers
import { cleanNumber, cleanString, cleanup, finalize, initialize, seismicDegrees } from './helpers';

// services
import { LogService as log } from '../services';

async function loadData(): Promise<any> {
  return new Promise((resolve, reject) => {
    return PDFTableExtractor(
      './resources/risc_seismic_2020.pdf',
      data => resolve(data),
      err => reject(err),
    );
  })
}

async function dataImportFromCsv(): Promise<any> {
  return loadData();
}

function getValues(table: any) {
  return {
    number: table[1],
    streetType: table[2],
    address: cleanString(table[3]),
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

async function processCsvData(data) {
  const tables = _.reduce(data.pageTables, (r, pageTable) => r.concat(pageTable.tables), []);

  let seismicRating;
  let previousBuilding;
  const degrees = _.values(seismicDegrees);
  for (const table of tables) {
    if (table[1] === 'Nr') {
      seismicRating = degrees.shift();
      continue;
    }
    if (seismicRating) {
      const buildingObject = getValues(table);
      if (new Set(table).size < 10) {
        Object.keys(buildingObject).forEach(key => [null, ''].includes(buildingObject[key]) && delete buildingObject[key]);
        Object.keys(buildingObject).forEach((key) => {
          previousBuilding[key] += buildingObject[key]
        });
        // noinspection JSUnusedAssignment
        previousBuilding.save()
      } else {
        previousBuilding = await Building.create(buildingObject);
        await BuildingRating.create({
          seismicRating,
          buildingId: previousBuilding.id,
        })
      }
    }
  }
}

(async () => {
  await initialize();

  try {
    let csvData = await dataImportFromCsv();
    await processCsvData(csvData);
    await finalize();
  } catch (e) {
    log.error(`Error importing csv data: ${e.message}`);
    await cleanup();
  }

  process.exit();
})();


