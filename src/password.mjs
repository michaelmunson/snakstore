import crypto from "crypto";


const CHARS = {
    special : '!@#$%^&*()<>-+_={}[]?,.:;',
    upper : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower : 'abcdefghijklmnopqrstuvwxyz',
    number : '0123456789'
}

const CONFIG = {
    requirements: ["special","upper","lower","number"],
    minLen:8
}

const rand = (max=20) => Math.floor(Math.random() * max);

export class Password extends String {
    static #minLen=8; 
    static #requirements=["special","uppercase","lowercase","number","length"];
    static #iterations=10000;
    static #hashLen=512
    static get #reqCheckers(){
        return {
            uppercase : (str) => str.toLowerCase() !== str,
            lowercase : (str) => str.toUpperCase() !== str,
            special : (str) => {
                const specchars = `!@#$%^&*(){}[]?,.:`;
                for (const char of specchars){
                    if (str.includes(char)) return true; 
                }
                return false; 
            },
            number : (str) => {
                const numbers = '0123456789';
                for (const num of numbers){
                    if (str.includes(num)) return true; 
                }
                return false; 
            },
            length : (str) => {
                return str.length >= Password.#minLen; 
            }
        }
    }
    constructor(string){
        super(string);
    }
    encrypt(encryptionKey){
        const plainText = this.toString(); 
        try {
            const iv = crypto.randomBytes(16);
            const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
            let encrypted = cipher.update(plainText);
            encrypted = Buffer.concat([encrypted, cipher.final()])
            return iv.toString('hex') + ':' + encrypted.toString('hex');
    
        } catch (error) {
            console.log(error);
        }
    }
    decrypt(encryptionKey){
        const encryptedText = this.toString();
        try {
            const textParts = encryptedText.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
    
            const encryptedData = Buffer.from(textParts.join(':'), 'hex');
            const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
            const decrypted = decipher.update(encryptedData);
            const decryptedText = Buffer.concat([decrypted, decipher.final()]);
            return decryptedText.toString();
        } catch (error) {
            console.log(error)
        }
    }
    async hash(){
        const password = this;
        const salt = this; 
        return new Promise((resolve, reject) => {
            const iterations = 10000; // Adjust the number of iterations based on your security requirements
            const keylen = 512; // Output key length in bytes
    
            crypto.pbkdf2(password, salt, iterations, keylen, 'sha512', (err, derivedKey) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(derivedKey.toString('ascii'));
                }
            });
        });
    }
    static forceMeetRequirements(password, requirements=Password.#requirements){
        const missingReqs = Password.missingRequirements(password, requirements);
        if (missingReqs.length === 0) return password; 
        const reqFixers = {
            uppercase(str, numIters=1){
                const randnum = rand(str.length);
                if (str[randnum].toUpperCase() === str[randnum]){
                    return this.uppercase(str, numIters);
                } else if (numIters && numIters > 1) {
                    str = str.slice(0, randnum) + str[randnum].toUpperCase() + str.slice(randnum + 1);
                    return this.uppercase(str, numIters-1);
                } else {
                    return str.slice(0, randnum) + str[randnum].toUpperCase() + str.slice(randnum + 1);
                }
            },
            lowercase(str, numIters=1){
                const randnum = rand(str.length);
                if (str[randnum].toLowerCase() === str[randnum]){
                    return this.lowercase(str, numIters);
                } else if (numIters && numIters > 1) {
                    str = str.slice(0, randnum) + str[randnum].toLowerCase() + str.slice(randnum + 1);
                    return this.lowercase(str, numIters-1);
                } else {
                    return str.slice(0, randnum) + str[randnum].toLowerCase() + str.slice(randnum + 1);
                }
            },
            special(str, numIters=1){
                const randspec = CHARS.special[rand(CHARS.special.length-1)]; 
                const randnum = rand(str.length);
                if (CHARS.special.split('').includes(str[randnum])){
                    return this.special(str, numIters);
                } else if (numIters && numIters > 1) {
                    str = str.slice(0, randnum) + randspec + str.slice(randnum + 1);
                    return this.special(str, numIters-1);
                } else {
                    return str.slice(0, randnum) + randspec + str.slice(randnum + 1);
                }
            },
            number(str, numIters=1){
                const randnumchar = rand(10); 
                const randnum = rand(str.length);
                if (CHARS.number.split('').includes(str[randnum])){
                    return this.number(str, numIters);
                } else if (numIters && numIters > 1) {
                    str = str.slice(0, randnum) + randnumchar + str.slice(randnum + 1);
                    return this.number(str, numIters-1);
                } else {
                    return str.slice(0, randnum) + randnumchar + str.slice(randnum + 1);
                }
            },
            length(str){
                const append = Password.generateRandom(Password.minLen - str.length, []);
                return str + append; 
            }
        }
        for (const req of missingReqs){
            password = reqFixers[req](password); 
        }
        return password;
    }
    static missingRequirements(password, requirements=Password.#requirements){
        const reqCheckers = Password.#reqCheckers; 
        const failed = []; 
        for (const req of requirements){
            if (!reqCheckers[req](password)) failed.push(req); 
        }
        return failed; 
    }
    static isMeetsRequirements(password, requirements=Password.#requirements){
        const reqCheckers = Password.#reqCheckers; 
        for (const req of requirements){
            if (!reqCheckers[req](password)) return false; 
        }
        return true; 
    }
    /**
     * @param {Number} len the length of the password
     * @param {Array<"special"|"upper"|"lower"|"number">} requirements password requirements
     * @returns {string} password
    */
    static generateRandom(len=20, requirements=Password.#requirements){
        const chars = CHARS.lower + CHARS.upper + CHARS.special + CHARS.special; 
        let password = "";
        for (let i = 0; i < len; i++){
            const getChar = () => {
                const ind = rand(chars.length);
                const char = chars[ind];
                if (char === password[password.length-1]) return getChar(); 
                else return char; 
            }
            password += getChar(); 
        }
        
        return Password.forceMeetRequirements(password, requirements); 
    }
    static configure(config=CONFIG){
        const {minLen, requirements} = {...CONFIG, ...config};
        Password.minLen = minLen;
        Password.requirements = requirements; 
    }
    static encrypt(password, encryptionKey){
        try {
            const iv = crypto.randomBytes(16);
            const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
            let encrypted = cipher.update(password);
            encrypted = Buffer.concat([encrypted, cipher.final()])
            return iv.toString('hex') + ':' + encrypted.toString('hex');
    
        } catch (error) {
            console.log(error);
        }
    }
    static decrypt(encryptedPassword, encryptionKey){
        try {
            const textParts = encryptedPassword.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
    
            const encryptedData = Buffer.from(textParts.join(':'), 'hex');
            const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
            const decrypted = decipher.update(encryptedData);
            const decryptedText = Buffer.concat([decrypted, decipher.final()]);
            return decryptedText.toString();
        } catch (error) {
            console.log(error)
        }
    }
    static hash(password, salt){
        return new Promise((resolve, reject) => {
            const iterations = Password.#iterations; // Adjust the number of iterations based on your security requirements
            const keylen = Password.#hashLen; // Output key length in bytes
    
            crypto.pbkdf2(password, salt, iterations, keylen, 'sha512', (err, derivedKey) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(derivedKey.toString('hex'));
                }
            });
        });
    }
}
/* export class Passwords extends Map {
    constructor(passwords){
        if (typeof passwords === "string"){
            super(passwords.split("\n").map(kl => {
                const [name, password] = kl.split("=");
                return [name, new Password(password)]; 
            }));
        } else {
            super(passwords); 
        }
    }
    toObject(){
        const passwordObject = {}; 
        for (let [path,password] of this){
            let currObj = passwordObject; 
            if (path.startsWith("/")) path = path.replace("/","");
            const p = path.split("/");
            const [paths,name] = [p.slice(0,-1), p.slice(-1)];
            // console.log("Paths:",paths,"... Name:",name);
            for (const path of paths){
                if (path in currObj){
                    currObj = currObj[path]; 
                } else {
                    currObj[path] = {}; 
                    currObj = currObj[path]; 
                }
            }
            currObj[name] = password; 
        }
        return passwordObject; 
    }
} */

export function encrypt(plainText, encryptionKey){
    try {
        const iv = crypto.randomBytes(16);
        const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        let encrypted = cipher.update(plainText);
        encrypted = Buffer.concat([encrypted, cipher.final()])
        return iv.toString('hex') + ':' + encrypted.toString('hex');

    } catch (error) {
        console.log(error);
    }
}
export function decrypt(encryptedText, encryptionKey){
    try {
        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');

        const encryptedData = Buffer.from(textParts.join(':'), 'hex');
        const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        const decrypted = decipher.update(encryptedData);
        const decryptedText = Buffer.concat([decrypted, decipher.final()]);
        return decryptedText.toString();
    } catch (error) {
        console.log(error)
    }
}

export default Password; 