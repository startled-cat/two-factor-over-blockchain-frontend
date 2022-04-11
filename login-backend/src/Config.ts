import 'dotenv/config';
import { AbiItem } from 'web3-utils';
import axios from 'axios';
const fs = require('fs');
const networks = require("./networks.json");
const abi_file = require("./abi.json");

export const abi_local: AbiItem[] = abi_file["abi"];
const map_filename: string = "src/map.json";

export interface NetworkConfig {
    name: string,
    contract_address: string,
    gateway_url: string,
}
function getEnv(var_name: string, default_value?: string): string {
    let x = process.env[var_name];
    if (x === undefined) {
        if (default_value !== undefined) {
            return default_value;
        } else {
            throw new Error(`Missing env variable: ${var_name}`);
        }
    } else {
        return x;
    }
}
export const accounts = [
    {
        address: getEnv("ACCOUNT"),
        pk: getEnv("ACCOUNT_PK")
    }
]

const replaceEnvVariables = (str: string) => {
    Object.keys(process.env).forEach(env => {
        str = str.replace(`\${${env}}`, "" + process.env[env]);
    });
    return str
}
Object.keys(networks).filter(x => x != "default").forEach(network_name => {
    Object.keys(networks[network_name]).forEach(option => {
        networks[network_name][option] = replaceEnvVariables(networks[network_name][option]);
    })
})

export async function loadContractConfig(force_update: boolean = false) {
    const url: string = getEnv("CHAIN_TO_CONTRACT_MAP_URL");
    const contract_name: string = getEnv("CONTRACT_NAME");
    let chain_to_contract_map: any;

    if (force_update) {
        console.log("deleting config file")
        fs.unlinkSync(map_filename);
    }

    // get from file
    console.log("loading config from file...");
    try {
        const data = fs.readFileSync(map_filename, { encoding: 'utf8', flag: 'r' });
        console.log("success");
        chain_to_contract_map = JSON.parse(data);
    } catch (error) {
        console.log("error, loading config from url ...");
        // get map from repo
        await axios.get(url).then(response => {
            if (response.status == 200) {
                console.log("success, saving config to file ...");
                chain_to_contract_map = response.data;
                // save map to file
                fs.writeFile(map_filename, JSON.stringify(chain_to_contract_map), 'utf8', function (err: any) {
                    if (err) {
                        console.warn("An error occured while writing JSON Object to File.");
                    }
                    console.log("config has been saved");
                });

            } else {
                throw new Error(`GET ${url} response status = ${response.status}`);
            }
        }).catch(error => {
            console.error("error getting config grom url");
            chain_to_contract_map = {};
            console.error(error);
            throw new Error(error);
        });
    }

    Object.keys(chain_to_contract_map).forEach(chain_id => {
        if (contract_name in chain_to_contract_map[chain_id]) {
            if (!(chain_id in networks)) {
                networks[chain_id] = {};
            }
            networks[chain_id].contract_address = chain_to_contract_map[chain_id]["" + contract_name][0];
        } else {
            console.warn(`Contract not deployed on network: ${chain_id}`)
        }
    })
}

export { networks }
