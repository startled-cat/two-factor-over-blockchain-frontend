
interface User{
    login: string,
    password: string,
    account_address: string,
}
const users_database:User[] = [
    {
        login: "user1",
        password: "password1",
        account_address: "0x66aB6D9362d4F35596279692F0251Db635165871"
    },
    {
        login: "fake_user",
        password: "fake_user",
        account_address: "0x123"
    }
]

// function that authenticates users password
export function authenticateUser(login: string, password: string): boolean {
    let user_record = users_database.find(x => x.login == login);
    if (user_record == undefined) {
        return false;
    } else {
        return user_record.password == password;
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