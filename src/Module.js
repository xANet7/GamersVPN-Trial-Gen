const fs = require("fs");
const Solver = require("capsolver-npm");
const puppeteer = require("puppeteer-extra");
const config = require("../config/config.json");

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

module.exports = class Module {
    constructor() {
        this.pages = [];
        this.browser = null;
        this.captchaQueue = [];
    }
    static async initialize(numPages) {
        const instance = new Module();
        await instance.launchBrowser();
        await Promise.all(
            Array.from({ length: numPages }, (_, i) =>
                instance.createTab(i + 1)
            )
        );
        await Promise.all(
            instance.pages.map(({ page, currentPage }) =>
                instance.register(page, currentPage)
                    .catch(err => console.error(`[BOT-${currentPage}] Error:`, err.message))
            )
        );
    }
    async createTab(currentPage) {
        const page = await this.browser.newPage();
        if (config.proxy.mode) {
            await page.authenticate({
                username: config.proxy.username,
                password: config.proxy.password
            });
        }
        console.info(`[BOT-${currentPage}] Starting...!`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto('https://gamersvpn.net/register', { waitUntil: 'networkidle0' });
        this.pages.push({ page, currentPage });
    }
    async launchBrowser() {
        const args = ['--disable-gpu', '--no-sandbox'];
        if (config.proxy.mode) {
            args.push(`--proxy-server=${config.proxy.server}`);
        }
        this.browser = await puppeteer.launch({
            args: args
        });
        console.info("Browser instance created!");
    }
    async register(page, currentPage) {
        const email = this.randomEmail();
        const username = this.randomUsername(8);
        const password = this.randomPassword(12);
        console.info(`[BOT-${currentPage}] Registering...!`);
        await page.type('#username', username);
        await page.type('#email', email);
        await page.type('#password', password);
        await page.type('#password2', password);
        const solveCaptchaTask = async () => {
            const captchaFileName = `c_bot_${currentPage}.png`;
            const captchaImage = await page.waitForSelector('#cap');
            await captchaImage.screenshot({ path: `./${captchaFileName}` });
            console.info(`[BOT-${currentPage}] Solving captcha...!`);
            try {
                const solver = new Solver(config.capsolver_api_key);
                const result = await solver.image2text({ body: fs.readFileSync(captchaFileName, "base64") });
                if (result) {
                    await page.type('#captcha', result.text);
                    await page.click('#btn');
                    await page.waitForNavigation();
                    console.log(`[BOT-${currentPage}] Registering account success.`);
                    fs.unlinkSync(captchaFileName);
                    await this.login(username, password, page, currentPage);
                } else {
                    console.error(`[BOT-${currentPage}] CAPTCHA solving failed.`);
                }
            } catch (error) {
                console.error(`[BOT-${currentPage}] Error during registration:`, error.message);
            }
        };
        this.captchaQueue.push(solveCaptchaTask);
        if (this.captchaQueue.length === 1) await this.processCaptchaQueue();
    }
    async processCaptchaQueue() {
        if (this.captchaQueue.length === 0) return;
        const nextTask = this.captchaQueue.shift();
        await nextTask();
        await this.processCaptchaQueue();
    }
    async login(username, password, page, currentPage) {
        try {
            console.info(`[BOT-${currentPage}] Logging in to account.`);
            await page.type('#username', username);
            await page.type('#password', password);
            await page.waitForSelector('#btn');
            await page.click('#btn');
            await page.waitForNavigation();
            await page.goto('https://gamersvpn.net/plans');
            await page.click('div.alert.alert-info.mt-2 > button');
            const status = await page.$eval('center > i', el => el.classList.contains('fa-meh-o'));
            if (!status) {
                console.log('\x1b[32m%s\x1b[0m', `[BOT-${currentPage}] Free trial accepted.`);
            } else {
                console.error('\x1b[31m%s\x1b[0m', `[BOT-${currentPage}] Free trial not accepted.`);
            }
            fs.writeFileSync('result.txt', `${username}:${password}\n`, { flag: 'a+' });
            await page.close();
        } catch (error) {
            console.error(`[BOT-${currentPage}] Error logging in:`, error.message);
        }
    }
    randomEmail() {
        const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        const randomUser = Math.random().toString(36).substring(2, 10);
        return `${randomUser}@${randomDomain}`;
    }
    randomUsername(length) {
        let username = "";
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = 0; i < length; i++) {
            username += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return username;
    }
    randomPassword(length) {
        let password = "";
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
};
