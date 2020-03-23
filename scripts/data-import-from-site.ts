// npm
import * as DomParser from 'dom-parser';
import * as _ from 'lodash';
import * as request from 'request-promise-native';

// models
import { cleanNumber, cleanString, cleanup, finalize, getGpsCoordinates, initialize, seismicDegrees } from './helpers';

// models
import { Building, BuildingRating } from '../models';

// services
import { LogService as log } from '../services';


const baseUrl = 'https://amccrs-pmb.ro/cladiri/grad';

const tableHeader = [
  'Nr. crt.',
  'Adresa',
  'Nr',
  'Sector',
  'Anul construirii',
  'Regimul de inaltime',
  'Numar de apartamente',
  'Aria desfasurata',
  'Anul Elaborarii Expertizei Tehnice',
  'Expertul tehnic atestat pentru cerinta esentiala de calitate-rezistenta mecanica si stabilitate de catre M.D.R.A.P.',
  'Observatii',
  'Clasa de risc seismic'
];

async function processData(domParser: DomParser, degree: string) {
  // Retrieving url content
  const url = `${baseUrl}/${degree}`
  log.info(`Processing: ${url}`);
  const content = await request.get(`${baseUrl}/${degree}`);

  // Parsing content html
  const html = domParser.parseFromString(content, 'text/html');

  // Finding table
  const table = html.getElementsByTagName('table');
  if (table.length == 1) {
    checkTableHeader(table);
    const rows = getTableRows(table);

    for (const row of rows) {
      const rowFields = row.getElementsByTagName("td");
      const rowData = _.map(rowFields, rowField => rowField.childNodes.length ? cleanString(rowField.childNodes[0].text) : '');
      const addressParts = rowData[1].match(/^([A-Z][a-z]+) ([A-Z0-9 ]+.*)/);
      const streetType = addressParts[1];
      const address = cleanString(addressParts[2]);
      const addressNumber = cleanString(rowData[2]);
      const gpsCoordinates = await getGpsCoordinates(streetType, address, addressNumber);
      const building = await Building.create({
        streetType,
        address,
        addressNumber,
        number: cleanNumber(rowData[0]),
        district: rowData[3],
        apartmentNumber: cleanNumber(rowData[6]),
        heightRegime: rowData[5],
        yearOfConstruction: rowData[4],
        yearOfExpertise: rowData[8],
        surfaceSize: cleanNumber(rowData[7]),
        expertName: rowData[9],
        comments: rowData[10],
        gpsCoordinatesLatitude: _.get(gpsCoordinates, 'latitude'),
        gpsCoordinatesLongitude: _.get(gpsCoordinates, 'longitude'),
      });

      await BuildingRating.create({
        seismicRating: seismicDegrees[degree],
        buildingId: building.id,
      });
    }

  } else {
    throw new Error(`Multiple tables found on ${url}`);
  }
}

function checkTableHeader(table: Array<DomParser.Node>): Array<string> {
  const thead = table[0].getElementsByTagName('thead')[0];
  const headerRow = thead.getElementsByTagName("tr")[0];
  const headerFields = headerRow.getElementsByTagName("th");
  const header = _.map(headerFields, headerField => cleanString(headerField.childNodes[0].text));
  if (!_.isEqual(header, tableHeader)) {
    throw new Error('Table header changed.');
  }
  return header;
}

function getTableRows(table: Array<DomParser.Node>) {
  const tbody = table[0].getElementsByTagName('tbody')[0];
  const rows = tbody.getElementsByTagName("tr")
  return rows;
}

async function dataImportFromSite(): Promise<any> {
  const domParser = new DomParser();
  for (const degree in seismicDegrees) {
    await processData(domParser, degree);
  }
  return;
}

(async () => {
  await initialize();

  try {
    await dataImportFromSite();
    await finalize();
  } catch (e) {
    log.error(`Error importing site: ${e.message}`);
    await cleanup();
  }

  process.exit();
})();


