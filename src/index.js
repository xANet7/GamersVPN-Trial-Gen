const figlet = require('figlet');
const Module = require('./Module.js');
const readline = require('readline');

(async () => {
    console.log('\x1b[34m%s\x1b[0m', figlet.textSync('Gamers VPN Account Trial', { whitespaceBreak: true }));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askAccountNumber = () => {
        rl.question('How much account? ', async (answer) => {
            if (!isNaN(answer) && Number(answer) > 0) {
                await Module.initialize(Number(answer));
                rl.close();
            } else {
                console.error('\x1b[31m%s\x1b[0m', 'Please input a valid number!');
                askAccountNumber();
            }
        });
    };

    askAccountNumber();
})();
