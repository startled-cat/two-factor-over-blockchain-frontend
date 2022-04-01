import 'dotenv/config'

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const networks = require("./../networks.json");


const accounts = [
    {
        address: process.env["ACCOUNT_1"],
        pk: process.env["ACCOUNT_1_PK"]
    },
    {
        address: process.env["ACCOUNT_2"],
        pk: process.env["ACCOUNT_2_PK"]
    }
]

const replaceEnvVariables = (string) => {
    Object.keys(process.env).forEach(env => {
        string = string.replace(`\${${env}}`, process.env[env]);
    });
    return string
}



Object.keys(networks).filter(x => x != "default").forEach(network_name => {
    Object.keys(networks[network_name]).forEach(option => {
        networks[network_name][option] = replaceEnvVariables(networks[network_name][option]);
    })

})

const network_config = networks[networks.default];
console.log({ network_config });


export { accounts, network_config }