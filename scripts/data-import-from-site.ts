// npm
import * as DomParser from 'dom-parser';
import * as _ from 'lodash';
import * as request from 'request-promise-native';


// models
// import { Building, BuildingRating } from '../models';
import { initialize, seismicDegrees } from './helpers';


const baseUrl = 'https://amccrs-pmb.ro/cladiri/grad';

async function loadData(): Promise<any> {
  const domParser = new DomParser();
  for (const degree in seismicDegrees) {
    const degreeUrl = `${baseUrl}/${degree}`;
    const content = await request.get(degreeUrl);
    const html = domParser.parseFromString(content, 'text/html');
    const table = html.getElementsByTagName('table');
    if (table.length) {
      const thead = table[0].getElementsByTagName('thead')[0];
      const headerRow = thead.getElementsByTagName("tr")[0];
      const headerFields = headerRow.getElementsByTagName("th");
      console.log(_.map(headerFields, headerField => headerField.childNodes[0].text));

      // first item element of the childNodes list of mycel
      //       myceltext=mycel.childNodes[0];

      // const tbody = table[0].getElementsByTagName('tbody');

    }




  }
  return;
}

async function dataImportFromSite(): Promise<any> {
  return loadData();
}

(async () => {
  await initialize();

  // let data =
  await dataImportFromSite();
  process.exit();
})();


