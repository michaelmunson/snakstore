import fs from "fs";
import Path from "node:path";
import { prnt, RED, GREEN, XBLUE, UNDERLINE, X, BLUE } from "escprint";
import {Password, decrypt, encrypt} from "./password.mjs";
import cli from "./cli.mjs";

const METAPATH = cli.relroot("./") + ".keystore_config";

export class Store {
    #storePath;
    constructor(storePath){
        this.#storePath = storePath; 
    }
    get storePath(){
        if (!this.#storePath){
            const metadata = this.metadata; 
            if (metadata && "storePath" in metadata){
                return metadata.storePath; 
            }
        } else {
            return this.#storePath; 
        }
    }
    set storePath(sp){
        this.#storePath = sp; 
    }
    get absPath(){
        return this.data.absPath || Path.resolve(this.storePath); 
    }
    get rawText(){
        return fs.readFileSync(this.storePath).toString("ascii");
    }
    get data(){
        try {
            return JSON.parse(this.rawText);
        }
        catch(e){
            throw new Error("Keystore data malformed");
        }
    }
    get keyhash(){
        return this.data.keyhash;
    }
    get passwords(){
        return this.data.passwords;
    }
    get metadata(){
        if (fs.existsSync(METAPATH)){
            const json = fs.readFileSync(METAPATH);
            try {
                return JSON.parse(json);
            } catch(e){
                return undefined; 
            }
        }
        return undefined; 
    }
    get config(){
        return this.data.config; 
    }

    async initialize({storePath, key, configure=false}){
        if (!storePath) storePath = await cli.read(`${UNDERLINE+XBLUE}Store Path:${X} `); 
        if (fs.existsSync(storePath)){
            return prnt(`${RED}ERROR: Keystore "${storePath}" already exists.`);
        }
        if (!key)             key = await cli.readpswd(`${UNDERLINE+XBLUE}Encryption Key:${X} `);
        const confKey             = await cli.readpswd(`${UNDERLINE+XBLUE}Confirm Key:${X} `);
        if (key !== confKey){
            return prnt(RED,"Initialization Error: Mismatch between Key and Confirmation Key");
        }

        const keyhash = await Password.hash(key, key); 
        
        try {
            fs.writeFileSync(storePath, JSON.stringify({
                absPath:Path.resolve(storePath),
                keyhash,
                config:{},
                passwords : {},
            }), {flag:"wx"}); 
            prnt("success")
            fs.writeFileSync(METAPATH, JSON.stringify({
                created: new Date().toUTCString(),
                storePath: Path.resolve(storePath),
                keyhash,
                config: {},
            }), {flag:"wx"});
            prnt(`${GREEN}✔︎ Key Store initialized successfully`);
            this.storePath = storePath;
        }
        catch(e){
            prnt(`<dim>${e}`); 
            Store.throwError(`${RED}ERROR: Could not initialize keystore "${storePath}"`);
        }
        
        if (configure){
            this.configure({key, storePath}); 
        }
    }

    async configure({key, storePath}){
        var {key, storePath} = await this.getArgs({key, storePath});
        const repo = await cli.read(`${BLUE}Repository URL:${X}`);
        const repoenc = encrypt(repo, key);
        const data = this.data;
        data.config = {
            ...data.config,
            repository: repoenc
        };
        fs.writeFileSync(storePath, JSON.stringify(data));
        prnt(`<green>✔︎ Keystore configured successfully`); 
    }

    async checkEncryptionKey(key){
        const hash = await Password.hash(key, key);
        return this.keyhash === hash;
    }

    async decrypt(key){

    }

    async save({path, password, key, storePath, isAddFields}){
        var {path, password, key, storePath} = await this.getArgs({path, password, key, storePath});

        path = Store.getKeyPath(path);
        
        if (this.passwordExists(path)){
            Store.throwError(`<red>Password already exists`);
        }
        
        const passwords = this.passwords; 
        const pswd = new Password(password).encrypt(key);
        const fields = !isAddFields ? {} : await Store.getAdditionalFields(key); 
        
        let pobj = passwords; 
        for (const p of path){ 
            if (p in pobj){
                pobj = pobj[p];
            } else {
                pobj[p] = {};
                pobj = pobj[p];
            }
        }

        Object.assign(pobj, {
            password:pswd,
            ...fields
        }); 

        const data = this.data;
        data.passwords = passwords;

        fs.writeFileSync(storePath, JSON.stringify(data)); 
        prnt(`${GREEN}✔︎ Password stored successfully`); 
    }

    async update({path, password, key, storePath, isAddFields}){
        var {path, key, storePath} = await this.getArgs({path, key, storePath});

        path = Store.getKeyPath(path);
        
        if (!this.passwordExists(path)){
            Store.throwError(`<red>Password does not exist`);
        }
        const passwords = this.passwords; 
        
        let pobj = passwords; 
        for (const p of path){ 
            if (p in pobj){
                pobj = pobj[p];
            } else {
                pobj[p] = {};
                pobj = pobj[p];
            }
        }

        prnt(`<underline>Current Fields:`)
        for (const field in pobj){
            prnt(`<dim>${field}:${pobj[field]}`);
        }

        const fields = !isAddFields ? {} : await Store.getAdditionalFields(key); 
        
        console.log(pobj);
        // Object.assign(pobj, {
        //     password:pswd,
        //     ...fields
        // }); 

        // const data = this.data;
        // data.passwords = passwords;

        // fs.writeFileSync(storePath, JSON.stringify(data)); 
        // prnt(`${GREEN}✔︎ Password stored successfully`); 
    }

    async list(keyPath){
        keyPath = Store.getKeyPath(keyPath);
        this.storePath = await this.getStorePath();
        
        if (!Store.exists(this.storePath)) return prnt(`<red>Store path "${storePath}" does not exist.`)
        
        let passObj = Store.walkPath(this.passwords, keyPath); 

        if (!passObj){
            return prnt(`<red>Password path does not exist.`)
        }

        prnt()
        if (keyPath.length > 0) prnt(`<green>${keyPath.join("<dim>/</>")}/`);

        (function printPasswordNames(obj=passObj,path=keyPath){
            const pad = p => !p.length ? "" : " ".repeat(p.length*2 - 2);
            for (const key in obj){
                const newPath = [...path,key]; 
                const val = obj[key];
                if (!key.endsWith("/")){
                    prnt(`${pad(newPath)}<dim>/</magenta>${key}`);
                }
                else {
                    prnt(`${pad(newPath)}${newPath[newPath.length -1]}<dim>`)
                    printPasswordNames(val, newPath);
                }
                if (path.length === 0){
                    prnt()
                }
            }
        })()
    }

    async get({path, key, storePath}){
        var {path, key, storePath} = await this.getArgs({path, key, storePath});
        const keyPath = Store.getKeyPath(path);
        const passObj = Store.walkPath(this.passwords, keyPath);
        // if (!passObj) Store.throwError(`<red>Password Path does not exist`);

        const printPassword = (obj=passObj, pad="") => {
            for (const field in obj){
                const value = new Password(obj[field]).decrypt(key);
                prnt(`${pad}<dim>${field}: ${value}`);
            }
        }

        function printPasswordNames(obj=passObj,path=keyPath){
            const pad = p => !p.length ? "" : " ".repeat(p.length*2 - 2);
            for (const key in obj){
                const newPath = [...path,key]; 
                const val = obj[key];
                if (!key.endsWith("/")){
                    prnt(`${pad(newPath)}<dim>/</magenta>${key}`);
                    printPassword(val, pad(newPath)+"  ");
                }
                else {
                    prnt(`${pad(newPath)}${newPath[newPath.length -1]}<dim>`)
                    printPasswordNames(val, newPath);
                }
                if (path.length === 0){
                    prnt()
                }
            }
        };

        if ('password' in passObj){
            printPassword(); 
        } else {
            if (keyPath.length > 0) prnt(`<green>${keyPath.join("<dim>/</>")}/`);
            printPasswordNames(); 
        }

    }

    async getArgs(argObj={}){
        if ('storePath' in argObj){
            if (!argObj['storePath']){
                const sp = await this.getStorePath();
                if (!Store.exists(sp)){
                    Store.throwError(`<Red>Error: Store path does not exist`); 
                } else {
                    this.storePath = sp;
                    argObj['storePath'] = sp; 
                }
            } else {
                if (!Store.exists(argObj['storePath'])){
                    Store.throwError(`<Red>Error: Store path does not exist`); 
                }
            }
        }
        if ('key' in argObj){
            if (!argObj['key']){
                const key = await cli.readpswd(`${UNDERLINE+XBLUE}Encryption Key:${X} `)
                if (!this.checkEncryptionKey(key)){
                    Store.throwError(`<Red>Error: Incorrect encryption key provided`); 
                } else {
                    argObj['key'] = key; 
                }
            } else {
                if (!this.checkEncryptionKey(argObj['key'])){
                    Store.throwError(`<Red>Error: Incorrect encryption key provided`); 
                }
            }

        }
        if ('path' in argObj){
            if (!argObj['path']){
                const passwordPath = await cli.read(`${UNDERLINE+XBLUE}Password Path:${X} `);
                const keyPath = Store.getKeyPath(passwordPath); 
                if (keyPath.length && keyPath[keyPath.length - 1] === "password"){
                    Store.throwError(`<red>Password name cannot be "password"`); 
                }
                argObj['path'] = passwordPath;
            }
            else {
                const keyPath = Store.getKeyPath(argObj['path']); 
                if (keyPath.length && keyPath[keyPath.length - 1] === "password"){
                    Store.throwError(`<red>Password name cannot be "password"`); 
                }
            }
        }
        if ('password' in argObj && !argObj['password']){
            const password = await cli.readpswd(`${UNDERLINE+XBLUE}Password:${X} `);
            // const confirmPassword = await cli.readpswd(`${UNDERLINE+XBLUE}Confirm Password:${X} `);
            // if (password !== confirmPassword){
            //     Store.throwError(`<red>Error: Passwords provided do not match`); 
            // }
            argObj['password'] = password; 
        }
        return argObj; 
    }

    async getStorePath(){
        return this.storePath || await cli.read(`${BLUE}Store Path:${X} `);
    }

    async upload({storePath, key}){
        var {storePath, key} = await this.getArgs({storePath, key});
        const absPath = this.absPath;
        const {repository:encRepository} = this.config;
        if (!encRepository) Store.throwError(`<red>Error: No repository configured`);
        const repository = decrypt(encRepository, key);
        const dirname = Path.dirname(absPath);
        process.chdir(dirname);
        const status = cli.run('git',['status']);
        if (status.trim().startsWith("fatal: not a git repository")){
            cli.run('git',['init']);
            cli.run('git',['add','.']);
            cli.run('git',['commit','-m','ks commit']);
            cli.run('git',['branch', '-M', 'main']);
            cli.run('git',['remote','add', 'origin',repository]);
            cli.run('git',['push','-u','origin','main']);
        } else {
            cli.run('git',['add','.']);
            cli.run('git',['commit','-m','ks commit']);
            cli.run('git',['push']);
        }
        prnt(`${GREEN}✔︎ Keystore uploaded successfully`); 
    }

    async removeKeystore({storePath, key}){
        var {storePath, key} = await this.getArgs({storePath, key});
        console.log(storePath)
        const confirmation = await cli.read('Are you sure you want to remove this directory? [y/N]');
        if (confirmation === "y"){
            const dirname = Path.dirname(storePath);
            const metapath = dirname + "/.__key_store__.json";
            fs.unlinkSync(storePath);
            fs.unlinkSync(metapath); 
            prnt(`${GREEN}✔︎ Keystore removed successfully`);
        } else {
            prnt(`<red> Cancelling operation`);
        }

    }

    async test({storePath, key}){
        var {storePath, key} = await this.getArgs({storePath, key});
        console.log(Store.getKeyPath("google/password/"))
        console.log(this.passwords)
    }

    /* UTILS*/
    passwordExists(keyPath=[]){
        if (typeof keyPath === "string") keyPath = Store.getKeyPath(keyPath); 
        let pobj = this.passwords;
        for (const p of keyPath){ 
            if (p in pobj){
                pobj = pobj[p];
            } else {
                return false;
            }
        }
        return !!pobj;
    }

    /* STATIC UTILS */
    static exists(storePath){
        return fs.existsSync(storePath); 
    }
    static getKeyPath(keyPath=""){
        keyPath = keyPath 
            ?  keyPath?.split("/").filter(k => !!k).map(k => k+"/")
            : [];

        if (keyPath.length){
            keyPath[keyPath.length - 1] = keyPath[keyPath.length - 1].replace("/",""); 
        } 

        return keyPath; 
    }
    static walkPath(object, keyPath=[]){
        keyPath = (typeof keyPath === "string") ? Store.getKeyPath(keyPath) : keyPath; 
        for (const p of keyPath){
            if (p in object) object = object[p]; 
            else if (p+'/' in object) object = object[p+'/']
            else return undefined; 
        }
        return object; 
    }
    static async getAdditionalFields(key){
        const fields = {}; 
        let addFieldsInput = await cli.read(`${BLUE}Add Fields? [Y/n] ${X}`);
        let addFields = addFieldsInput !== "n"; 
        while (addFields){
            const name = await cli.read(`${BLUE+UNDERLINE}Name: ${X}`);
            const value = await cli.read(`${BLUE+UNDERLINE}Value: ${X}`);
            if (name === "password"){
                prnt(`<red>Field name cannot be "password"`); 
                continue;
            }
            fields[name] = new Password(value).encrypt(key); 
            addFields = (await cli.read(`${BLUE}Add Fields? [Y/n] ${X}`)).toLowerCase() !== "n"; 
        }
        return fields; 
    }
    static throwError(message){
        prnt(message);
        process.exit(1);
    }
}

export default Store;