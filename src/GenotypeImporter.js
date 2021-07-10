import Genotype from './Genotype';
import Germplasm from './Germplasm';
import Marker from './Marker';
import GenomeMap from './GenomeMap';
import Chromosome from './Chromosome';

export default class GenotypeImporter {
  constructor(genomeMap) {
    this.rawToGenoMap = new Map();
    this.rawToGenoMap.set('', Genotype.fromString(''));
    this.stateTable = new Map();
    this.stateTable.set(this.rawToGenoMap.get(''), 0);

    this.genomeMap = genomeMap;
    this.markerIndices = new Map();
    this.germplasmList = [];
	this.processedLines;
	this.totalLineCount;
  }

  getState(genoString) {
    let index = 0;
    try {
      let genotype = this.rawToGenoMap.get(genoString);
      if (genotype === undefined) {
        genotype = Genotype.fromString(genoString);
        this.rawToGenoMap.set(genoString, genotype);
      }

      index = this.stateTable.get(genotype);

      // If the genotype is not found in the map, we have a new genotype, so set
      // its index in the map to the size of the map
      if (index === undefined) {
        index = this.stateTable.size;
        this.stateTable.set(genotype, index);
      }
    } catch (error) {
      console.log(error);
    }
    return index;
  }

  initGenotypeData() {
    const data = [];
    this.genomeMap.chromosomes.forEach((chromosome) => {
      data.push(Array(chromosome.markerCount()).fill(0));
    });

    return data;
  }

  processFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0)) {
      return;
    }

    if (line.startsWith('Accession') || line.startsWith('\t')) {
      const markerNames = line.split('\t');

      markerNames.slice(1).forEach((name, idx) => {
        const indices = this.genomeMap.markerByName(name);
        if (indices !== -1) {
          this.markerIndices.set(idx, indices);
        }
      });
      // TODO: write code to deal with cases where we don't have a map here...
      // console.log(this.genomeMap.totalMarkerCount());
      return;
    }
    const tokens = line.split('\t');
    const lineName = tokens[0];
    const genotypeData = this.initGenotypeData();
    tokens.slice(1).forEach((state, idx) => {
      const indices = this.markerIndices.get(idx);
      // console.log(indices);
      if (indices !== undefined && indices !== -1) {
        genotypeData[indices.chromosome][indices.markerIndex] = this.getState(state);
      }
    });

    const germplasm = new Germplasm(lineName, genotypeData);
    this.germplasmList.push(germplasm);
  }

  parseFile(fileContents) {
	this.processedLines = 0;
	this.totalLineCount = 0;
    const lines = fileContents.split(/\r?\n/);
	this.totalLineCount = lines.length;
    for (let line = 0; line < this.totalLineCount; line += 1) {
      this.processFileLine(lines[line]);
	  this.processedLines = line;
    }

    return this.germplasmList;
  }

  getImportProgressPercentage() {
	return parseInt(this.processedLines + " / " + this.totalLineCount);
  }

  // In situations where a map hasn't been provided, we want to create a fake or
  // dummy map one chromosome and evenly spaced markers
  createFakeMap(fileContents) {
    const lines = fileContents.split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];

      if (!line.startsWith('#')) {
        if (line.startsWith('Accession') || line.startsWith('\t')) {
          const markers = [];
          const markerNames = line.split('\t');

          // Use the genotype data format's header line to map marker names to
          // a 0 to length range of indices which double up as marker positions
          // for mapless loading
          markerNames.slice(1).forEach((name, idx) => {
            const marker = new Marker(name, 'unmapped', idx);
            markers.push(marker);
          });

          const chromosomes = [];
          chromosomes.push(new Chromosome('unmapped', markers.length, markers));
          this.genomeMap = new GenomeMap(chromosomes);

          return this.genomeMap;
        }
      }
    }
    return this.genomeMap;
  }

  // A method to create a fake map from BrAPI variantset calls
  createFakeMapFromVariantSets(variantSetCalls) {
    const firstGenoName = variantSetCalls[0].callSetName;
    const firstGenoCalls = variantSetCalls.filter(v => v.callSetName === firstGenoName).map(v => v.markerName);
    // Make sure we only have unique markerNames
    const markerNames = [...new Set(firstGenoCalls)];

    const markers = [];
    markerNames.forEach((name, idx) => {
      const marker = new Marker(name, 'unmapped', idx);
      markers.push(marker);
    });

    const chromosomes = [];
    chromosomes.push(new Chromosome('unmapped', markers.length, markers));
    this.genomeMap = new GenomeMap(chromosomes);

    return this.genomeMap;
  }

  // A method which converts BrAPI variantSetsCalls into Flapjack genotypes for
  // rendering
  parseVariantSetCalls(variantSetsCalls) {
    const genoNames = new Set(variantSetsCalls.map(v => v.lineName));

    genoNames.forEach((name) => {
      const genoCalls = variantSetsCalls.filter(v => v.lineName === name);

      if (this.markerIndices.size === 0) {
        genoCalls.forEach((call, idx) => {
          const indices = this.genomeMap.markerByName(call.markerName);
          if (indices !== -1) {
            this.markerIndices.set(idx, indices);
          }
        });
      }

      const genotypeData = this.initGenotypeData();
      genoCalls.forEach((call, idx) => {
        const indices = this.markerIndices.get(idx);
        if (indices !== undefined && indices !== -1) {
          genotypeData[indices.chromosome][indices.markerIndex] = this.getState(call.allele);
        }
      });
      const germplasm = new Germplasm(name, genotypeData);
      this.germplasmList.push(germplasm);
    });

    return this.germplasmList;
  }
}
