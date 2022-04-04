import 'dotenv/config';

// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
const networks = require("./networks.json");

export interface NetworkConfig {
    name: string,
    explorer_api_key: string,
    explorer_url: string,
    contract_address: string,
    api_url: string,
    gateway_url: string,
    native_coin_price_api: string,
}


export const accounts = [
    {
        address: process.env["ACCOUNT_1"],
        pk: process.env["ACCOUNT_1_PK"]
    },
    {
        address: process.env["ACCOUNT_2"],
        pk: process.env["ACCOUNT_2_PK"]
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

export { networks }
