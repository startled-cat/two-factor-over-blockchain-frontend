import Web3 from 'web3';
import { network_config } from './Config.js';
export var web3 = new Web3(network_config.gateway_url);
