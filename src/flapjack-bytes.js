import axios from 'axios';
import GenotypeCanvas from './genotypecanvas';
import CanvasController from './canvascontroller';
import GenotypeImporter from './GenotypeImporter';
import NucleotideColorScheme from './NucleotideColorScheme';
import MapImporter from './MapImporter';
import DataSet from './DataSet';

export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let genotypeImporter;

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  // TODO: need to investigate a proper clean way to implement this controller
  // functionality
  // eslint-disable-next-line no-unused-vars
  let canvasController;

  const boxSize = 16;

  let colorScheme;

  let genomeMap;
  let dataSet;

  function sendEvent(eventName, domParent) {
    // TODO: Invesitgate using older event emitting code for IE support
    const canvasHolder = document.getElementById(domParent.slice(1));

    // Create the event.
    const event = new Event(eventName);

    canvasHolder.dispatchEvent(event);
  }

  function zoom(size) {
    genotypeCanvas.zoom(size, colorScheme);
  }

  function createRendererComponents(domParent, width, height) {
    const canvasHolder = document.getElementById(domParent.slice(1));

    genotypeCanvas = new GenotypeCanvas(width, height, boxSize);
    canvasHolder.append(genotypeCanvas.canvas);

    const zoomDiv = document.createElement('div');
    zoomDiv.id = 'zoom-holder';

    const form = document.createElement('form');
    const formRow = document.createElement('div');
    formRow.classList.add('row');
    const zoomCol = document.createElement('div');
    zoomCol.classList.add('col');
    const formZoomDiv = document.createElement('div');
    formZoomDiv.classList.add('form-group');

    const zoomFieldSet = document.createElement('fieldset');
    zoomFieldSet.classList.add('bytes-fieldset');

    const zoomLegend = document.createElement('legend');
    const zoomLegendText = document.createTextNode('Controls');
    zoomLegend.appendChild(zoomLegendText);

    const zoomLabel = document.createElement('label');
    zoomLabel.setAttribute('for', 'zoom-control');
    zoomLabel.innerHTML = 'Zoom:';

    const range = document.createElement('input');
    range.setAttribute('type', 'range');
    range.min = 2;
    range.max = 64;
    range.value = 16;

    range.addEventListener('change', () => {
      zoom(range.value);
    });

    range.addEventListener('input', () => {
      zoom(range.value);
    });

    const colorButton = document.createElement('button');
    colorButton.id = 'colorButton';
    const textnode = document.createTextNode('Color schemes...');
    colorButton.appendChild(textnode);

    const colorFieldSet = createColorSchemeFieldset();

    zoomFieldSet.appendChild(zoomLegend);
    zoomFieldSet.appendChild(zoomLabel);
    zoomFieldSet.appendChild(range);
    formZoomDiv.appendChild(zoomFieldSet);
    zoomCol.appendChild(formZoomDiv);
    formRow.appendChild(zoomCol);

    formRow.appendChild(colorFieldSet);
    form.appendChild(formRow);
    zoomDiv.appendChild(form);
    
    canvasHolder.appendChild(zoomDiv);

    addStyleSheet();

    canvasController = new CanvasController(genotypeCanvas);
  }

  function addRadioButton(name, id, text, checked, parent) {
    const formCheck = document.createElement('div');
    formCheck.classList.add('form-check');
    const radio = document.createElement('input');
    radio.setAttribute('type', 'radio');
    radio.name = name;
    radio.id = id;
    radio.checked = checked;
    radio.classList.add('form-check-input');

    const radioLabel = document.createElement('label');
    radioLabel.htmlFor = id;
    radioLabel.classList.add('form-check-label');
    const labelText = document.createTextNode(text);
    radioLabel.appendChild(labelText);

    formCheck.appendChild(radio);
    formCheck.appendChild(radioLabel);
    parent.appendChild(formCheck);
  }

  function addCSSRule(sheet, selector, rules, index) {
    if ('insertRule' in sheet) {
      sheet.insertRule(selector + '{' + rules + '}', index);
    } else if ('addRule' in sheet) {
      sheet.addRule(selector, rules, index);
    }
  }

  function addStyleSheet() {
    let sheet = (function() {
      // Create the <style> tag
      let style = document.createElement("style");

      // WebKit hack :(
      style.appendChild(document.createTextNode(""));

      // Add the <style> element to the page
      document.head.appendChild(style);

      return style.sheet;
    }());

    addCSSRule(sheet, '.bytes-fieldset > legend', 'border-style: none; border-width: 0; font-size: 14px; line-height: 20px; margin-bottom: 0; width: auto; padding: 0 10px; border: 1px solid #e0e0e0;');
    addCSSRule(sheet, '.bytes-fieldset', 'border: 1px solid #e0e0e0; padding: 10px;');
    // addCSSRule(sheet, 'input', 'margin: .4rem;');
  }

  function createColorSchemeFieldset() {
    const formCol = document.createElement('div');
    formCol.classList.add('col');

    const formGroup = document.createElement('div');
    formGroup.classList.add('form-group');

    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('bytes-fieldset');

    const legend = document.createElement('legend');
    const legendText = document.createTextNode('Color Schemes');
    legend.appendChild(legendText);

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedScheme', 'nucleotideScheme', 'Nucleotide', true, radioCol);
    addRadioButton('selectedScheme', 'similarityScheme', 'Similarity to line', false, radioCol);

    const selectLabel = document.createElement('label');
    selectLabel.htmlFor = 'lineSelect';
    selectLabel.classList.add('col-form-label');
    const labelText = document.createTextNode('Comparison line:');
    selectLabel.appendChild(labelText);

    const lineSelect = document.createElement('select');
    lineSelect.id = 'lineSelect';
    lineSelect.disabled = true;

    fieldset.appendChild(legend);
    fieldset.appendChild(radioCol);
    fieldset.appendChild(selectLabel);
    fieldset.appendChild(lineSelect);
    formGroup.appendChild(fieldset);

    formCol.appendChild(formGroup);

    return formCol;
  }

  function processMarkerPositionsCall(client, url, params, markerpositions = []) {
    return client.get(url, params)
      .then((response) => {
        const { currentPage, totalPages } = response.data.metadata.pagination;

        const newData = response.data.result.data;
        markerpositions.push(...newData.map(m => ({
          name: m.variantName,
          chromosome: m.linkageGroupName,
          position: m.position,
        })));

        if (currentPage < totalPages - 1) {
          const nextPage = currentPage + 1;
          const newParams = { params: { page: nextPage } };
          return processMarkerPositionsCall(client, url, newParams, markerpositions);
        }
        return markerpositions;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  }

  function processVariantSetCall(client, url, params, variantSetCalls = []) {
    return client.get(url, params)
      .then((response) => {
        const { nextPageToken } = response.data.metadata.pagination;
        const newData = response.data.result.data;
        variantSetCalls.push(...newData.map(calls => ({
          lineName: calls.callSetName,
          markerName: calls.variantName,
          allele: calls.genotype.values[0],
        })));
        if (nextPageToken) {
          const newParams = { params: { pageToken: nextPageToken } };
          return processVariantSetCall(client, url, newParams, variantSetCalls);
        }
        return variantSetCalls;
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  }

  genotypeRenderer.renderGenotypesBrapi = function renderGenotypesBrapi(
    domParent,
    width,
    height,
    server,
    matrixId,
    mapId,
    authToken,
  ) {
    createRendererComponents(domParent, width, height);
    let germplasmData;

    const client = axios.create({ baseURL: server });
    client.defaults.headers.common.Authorization = `Bearer ${authToken}`;

    if (mapId !== null) {
      // TODO: GOBii don't have the markerpositions call implemented yet so I
      // can't load map data
      processMarkerPositionsCall(client, `/markerpositions?mapDbId=${mapId}`)
        .then((markerpositions) => {
          const mapImporter = new MapImporter();
          genomeMap = mapImporter.parseMarkerpositions(markerpositions);

          processVariantSetCall(client, `/variantsets/${matrixId}/calls`)
            .then((variantSetCalls) => {
              genotypeImporter = new GenotypeImporter(genomeMap);

              if (genomeMap === undefined) {
                genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
              }

              germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
              const { stateTable } = genotypeImporter;

              dataSet = new DataSet(genomeMap, germplasmData, stateTable);
              colorScheme = new NucleotideColorScheme(dataSet);

              populateLineSelect();

              genotypeCanvas.init(dataSet, colorScheme);
              genotypeCanvas.prerender();

              // Tells the dom parent that Flapjack has finished loading. Allows spinners
              // or similar to be disabled
              sendEvent('FlapjackFinished', domParent);
            })
            .catch((error) => {
              sendEvent('FlapjackError', domParent);
              // eslint-disable-next-line no-console
              console.log(error);
            });
        })
        .catch((error) => {
          sendEvent('FlapjackError', domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    } else {
      processVariantSetCall(client, `/variantsets/${matrixId}/calls`)
        .then((variantSetCalls) => {
          genotypeImporter = new GenotypeImporter(genomeMap);

          if (genomeMap === undefined) {
            genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
          }

          germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
          const { stateTable } = genotypeImporter;

          dataSet = new DataSet(genomeMap, germplasmData, stateTable);
          colorScheme = new NucleotideColorScheme(dataSet);

          populateLineSelect();

          genotypeCanvas.init(dataSet, colorScheme);
          genotypeCanvas.prerender();

          // Tells the dom parent that Flapjack has finished loading. Allows spinners
          // or similar to be disabled
          sendEvent('FlapjackFinished', domParent);
        })
        .catch((error) => {
          sendEvent('FlapjackError', domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    }
    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesUrl = function renderGenotypesUrl(
    domParent,
    width,
    height,
    mapFileURL,
    genotypeFileURL,
    authToken,
  ) {
    createRendererComponents(domParent, width, height);

    let mapFile;
    let genotypeFile;

    axios.get(mapFileURL, {}, { headers: { 'Content-Type': 'text/plain' } }).then((response) => {
      mapFile = response.data;
    }).catch((error) => {
      console.log(error)
    }).then(() => {
      if (mapFile !== undefined) {
        const mapImporter = new MapImporter();
        genomeMap = mapImporter.parseFile(mapFile);
      }

      axios.get(genotypeFileURL, {}, { headers: { 'Content-Type': 'text/plain' } }).then((response) => {
        genotypeFile = response.data;
      }).then(() => {
        genotypeImporter = new GenotypeImporter(genomeMap);

        if (genomeMap === undefined) {
          genomeMap = genotypeImporter.createFakeMap(genotypeFile);
        }

        const germplasmData = genotypeImporter.parseFile(genotypeFile);
        const { stateTable } = genotypeImporter;

        dataSet = new DataSet(genomeMap, germplasmData, stateTable);
        colorScheme = new NucleotideColorScheme(dataSet);

        populateLineSelect();

        genotypeCanvas.init(dataSet, colorScheme);
        genotypeCanvas.prerender();

        // Tells the dom parent that Flapjack has finished loading. Allows spinners
        // or similar to be disabled
        sendEvent('FlapjackFinished', domParent);
      }).catch((error) => {
        sendEvent('FlapjackError', domParent);
        // eslint-disable-next-line no-console
        console.log(error);
      });
    });
    return genotypeRenderer;
  };

  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reader.abort();
        reject(new DOMException('Problem parsing input file'));
      };

      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsText(file);
    });
  }

  function populateLineSelect() {
    const lineSelect = document.getElementById('lineSelect');
    dataSet.germplasmList.forEach((germplasm, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.text = germplasm.name;
      lineSelect.add(opt);
    });
  }

  genotypeRenderer.renderGenotypesFile = function renderGenotypesFile(
    domParent,
    width,
    height,
    mapFileDom,
    genotypeFileDom,
  ) {
    createRendererComponents(domParent, width, height);
    // let qtls = [];
    let germplasmData;

    const mapFile = document.getElementById(mapFileDom.slice(1)).files[0];
    const mapPromise = loadFromFile(mapFile);
    // const qtlPromise = loadFromFile(qtlFileDom);
    const genotypeFile = document.getElementById(genotypeFileDom.slice(1)).files[0];
    const genotypePromise = loadFromFile(genotypeFile);

    // Load map data
    mapPromise.then((result) => {
      const mapImporter = new MapImporter();
      genomeMap = mapImporter.parseFile(result);
    });

    // // Then QTL data
    // qtlPromise.then((result) => {
    //   const qtlImporter = new QtlImporter();
    //   qtlImporter.parseFile(result);
    //   qtls = qtlImporter.qtls;
    // });

    // Then genotype data
    genotypePromise.then((result) => {
      genotypeImporter = new GenotypeImporter(genomeMap);

      if (genomeMap === undefined) {
        genomeMap = genotypeImporter.createFakeMap(result);
      }

      germplasmData = genotypeImporter.parseFile(result);
      const { stateTable } = genotypeImporter;

      dataSet = new DataSet(genomeMap, germplasmData, stateTable);
      colorScheme = new NucleotideColorScheme(dataSet);

      populateLineSelect();

      genotypeCanvas.init(dataSet, colorScheme);
      genotypeCanvas.prerender();
    });

    return genotypeRenderer;
  };

  genotypeRenderer.getRenderingProgressPercentage = function getRenderingProgressPercentage() {
	return genotypeImporter == null ? -1 : genotypeImporter.getImportProgressPercentage();
  };

  return genotypeRenderer;
}