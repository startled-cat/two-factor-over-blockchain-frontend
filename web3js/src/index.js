import { getGasPrice } from './Web3Client.js';



const sth = async () => {
    let gasPrice = await getGasPrice();
    console.log({ gasPrice });
}

sth();
