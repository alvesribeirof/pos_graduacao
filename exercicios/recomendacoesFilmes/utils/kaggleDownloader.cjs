#!/usr/bin/env node

/**
 * 📥 Utilitário para baixar dados de filmes do Kaggle
 * 
 * Datasets recomendados:
 * - MovieLens: https://www.kaggle.com/datasets/grouplens/movielens-20m-dataset
 * - IMDb Movies: https://www.kaggle.com/datasets/pythonx/imdb-movies
 * - Netflix Prize: https://www.kaggle.com/datasets/netflix-inc/netflix-prize-data
 * 
 * Uso:
 * 1. Instale kaggle-cli: npm install -g kaggle
 * 2. Configure sua API key em ~/.kaggle/kaggle.json
 * 3. Execute: node utils/kaggleDownloader.js <dataset>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataDir = path.join(__dirname, '../data');

/**
 * Datasets disponíveis
 */
const DATASETS = {
    movielens: {
        name: 'MovieLens 20M',
        kgglId: 'grouplens/movielens-20m-dataset',
        description: 'Dataset de avaliações de filmes com ~20 milhões de ratings'
    },
    imdb: {
        name: 'IMDb Movies',
        kgglId: 'pythonx/imdb-movies',
        description: 'Dados de filmes do IMDb com metadados completos'
    },
    netflix: {
        name: 'Netflix Prize',
        kgglId: 'netflix-inc/netflix-prize-data',
        description: 'Dados históricos de visualizações da Netflix'
    }
};

function showUsage() {
    console.log(`
📥 Kaggle Downloader - Recomendador de Filmes

Datasets disponíveis:
${Object.entries(DATASETS).map(([key, dataset]) => 
    `  ${key.padEnd(15)} - ${dataset.name}\n${' '.repeat(18)}${dataset.description}`
).join('\n')}

Uso:
  node utils/kaggleDownloader.js <dataset>
  
Exemplo:
  node utils/kaggleDownloader.js movielens
  
Pré-requisitos:
  1. Instale Kaggle CLI: npm install -g kaggle
  2. Crie conta em kaggle.com
  3. Gere API token em https://www.kaggle.com/account
  4. Cole em ~/.kaggle/kaggle.json
    `);
}

function checkKaggleCLI() {
    try {
        execSync('kaggle --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function downloadDataset(datasetKey) {
    const dataset = DATASETS[datasetKey];
    
    if (!dataset) {
        console.error(`❌ Dataset '${datasetKey}' não encontrado`);
        showUsage();
        process.exit(1);
    }
    
    console.log(`\n📥 Baixando ${dataset.name}...`);
    console.log(`   Kaggle Dataset: ${dataset.kgglId}\n`);
    
    // Criar diretório se não existir
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        // Baixar dados do Kaggle
        execSync(
            `kaggle datasets download -d ${dataset.kgglId} -p ${dataDir}`,
            { stdio: 'inherit' }
        );
        
        console.log('\n✅ Download concluído!');
        console.log(`📁 Arquivos salvos em: ${dataDir}\n`);
        
        console.log('📝 Próximas etapas:');
        console.log('  1. Extraia os arquivos ZIP');
        console.log('  2. Converta os dados para o formato esperado');
        console.log('  3. Veja data/movies.json e data/users.json como exemplo\n');
        
    } catch (error) {
        console.error('❌ Erro ao baixar:', error.message);
        process.exit(1);
    }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showUsage();
    process.exit(0);
}

if (!checkKaggleCLI()) {
    console.error(`
❌ Kaggle CLI não encontrado!

Instale com:
  npm install -g kaggle

Depois configure sua API key:
  1. Vá em https://www.kaggle.com/account
  2. Clique em "Create New Token"
  3. Cole o arquivo kaggle.json em ~/.kaggle/
  4. Execute: chmod 600 ~/.kaggle/kaggle.json
    `);
    process.exit(1);
}

downloadDataset(args[0]);
