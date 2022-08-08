
interface User {
    login: string,
    password: string,
    account_address: string,
    chain_id: number;
}
const users_database: User[] = [
    {
        login: "user1337",
        password: "password",
        account_address: "0x66aB6D9362d4F35596279692F0251Db635165871",
        chain_id: 1337,
    },
    {
        login: "user3",
        password: "password",
        account_address: "0x815E5AA15828DE26e5Bc9313005b1Be99C3e4a77",
        chain_id: 3,
    },
    {
        login: "fake_user",
        password: "fake_user",
        account_address: "0x123",
        chain_id: 0,
    }
]

// function that authenticates users password
export function authenticateUser(login: string, password: string): boolean {
    console.log(`authenticating user: ${login} ${password}`)

    let user_record = users_database.find(x => x.login == login);
    console.log({ user_record })
    if (user_record == undefined) {
        console.log("user not found")
        return false;
    } else {
        console.log("user found");
        if (user_record.password == password) {
            console.log("user authenticated")
            return true;
        } else {
            console.log("user password incorrect")
            return false;
        }
    }
}

export function getUserAddress(login: string): string {
    let user_record = users_database.find(x => x.login == login);
    if (user_record == undefined) {
        throw new Error(`User ${login} not found`);
    } else {
        return user_record.account_address;
    }
}
export function getUserChainId(login: string): number {
    let user_record = users_database.find(x => x.login == login);
    if (user_record == undefined) {
        throw new Error(`User ${login} not found`);
    } else {
        return user_record.chain_id;
    }
}