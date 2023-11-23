import { $, X, prnt, RED } from "escprint";

class ArgMap extends Map {
    getx(...keys){
        return keys.map(key => this.get(key)); 
    }
}


export default class CMD {
    constructor(config = { options: {}, commands: {} }) {
        this.options  = config.options;
        this.commands = config.commands;
    }
    /**
     *
     *
     * @param {string[]} [argv]
     * @return {Promise<Map<string,string>>} 
     * @memberof CMD
    */
    parse(argv) {
        const createBiMap = () => {
            const map = {}; 
            for (const opt in this.options){
                map[opt] = opt;
                if (Array.isArray(this.options[opt]) && this.options[opt].length > 1){
                    map[this.options[opt][0]] = opt; 
                }
            }
            return map; 
        }
        const options = createBiMap(); 
        const free = []; 
        const argMap = new ArgMap(); 
        let lastArg = "";
        for (const arg of argv) {
            if (arg.startsWith("--")) {
                const argspl = arg.split("=")[0]
                const shortarg = (argspl in options) ? options[argspl] : argspl;
                if (arg.includes("=")) {
                    const [a, b] = arg.split("=");
                    argMap.set(shortarg, b);
                    lastArg = "";
                }
                else {
                    argMap.set(shortarg, null); 
                    lastArg = shortarg;
                }
            }
            else if (arg.startsWith("-")) {
                argMap.set(arg, null); 
                lastArg = arg;
            }
            else {
                if (arg in this.commands){
                    argMap.set(arg, null); 
                    lastArg = arg; 
                }
                else if (!lastArg){
                    free.push(arg); 
                }
                else {
                    if (lastArg.startsWith("-")){
                        argMap.set(lastArg, arg); 
                        lastArg = "";
                    }
                    else {
                        argMap.set(lastArg, arg); 
                        lastArg = "";
                    }
                }
            }
        }
        return new Promise(resolve => resolve(argMap));
    }
    help() {
        let len = 0;
        const all = {...this.commands,...this.options}; 
        
        for (const opt in all) {
            const thislen = opt.length;
            if (thislen > len) len = thislen;
        }
        len += 5; 

        prnt(`\n\n${$.Red}Options:\n`);
        for (const opt in all) {
            let pad = "";
            for (let i = 0; i < (len-opt.length); i++) {
                pad += " ";
            }
            prnt(`${$.Magenta}${opt + pad}${X}${all[opt]}`);
        }
    }
    get error(){
        const options = this.options;
        return {
            missingArgument(arg){
                prnt(`${RED}Usage:${X}\n${arg}  ${options[arg]}`)
            }
        }
    }
}