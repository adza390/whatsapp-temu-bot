const users = {
    'adza': 'Luka390'
};

function loginAdmin(username, password) {
    return users[username] === password;
}

module.exports = {
    loginAdmin
};
