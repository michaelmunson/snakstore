import fs from "fs";
import cli from "./src/cli.mjs";
import CMD from "./src/cmd.mjs";
import { RED, MAGENTA, BLUE, X, prnt, DIM, $, ITALIC } from "escprint";
import Password from "./src/password.mjs";
import Store from "./src/store.mjs";
const argv = process.argv.slice(2);

const cmd = new CMD({
    options: {
        "-h" : ["--help", "Get Help"],
        "-k" : ["--key", "[key] Specify encryption/decryption key"],
        "-g" : ["--generate", "[length] Generate random password of {length}"],
        "-p" : ["--password", "[password] Specify the path of the password"],
        "-s" : ["--store-path", "[filename] Specify the path of the key store"],
        "-a" : ["--add-fields", "Add additional fields to password"],
        "-ac" : ["--add-config", "Add configuration"],
        "--remove-keystore" : ["Remove a keystore"]
    },
    commands: {
        "save" : ["[password path] Save password to Keystore (-k -n -s)"],
        "decrypt" : ["[encrypted text] Specify key to decrpyt"],
        "encrypt" : ["[password] Specify password to encrypt"],
        "get" : ["[? key path] Specify path of key to decypt"],
        "init" : ["[filename] Specify keystore file to create"],
        "rm" : ["[password path] Remove specified password"],
        "ls" : ["[? path] List key names"],
        "upload" : ["Upload keystore to private repository"],
        "update" : ["[password path] Update password"], 
        "config" : ["Configure Key Store"],
        "test" : ["test"]
    }
});

cmd.parse(argv).then(async args => {
    // console.log(args);
    // console.log(args.getx("init", "-k"))
    // return 
    const [_g, _k] = args.getx("-g","-k");
    const store = new Store();

    if (args.size === 0){
        prnt(RED,"")
    }

    if (args.has('-h')) cmd.help();

    if (args.has('-g') && args.size === 1){
        if (_g && isNaN(_g)) prnt(RED+"-g arguments expected to be of type int"+X); 
        if (_g) prnt(Password.generateRandom(parseInt(_g)));
        else    prnt(Password.generateRandom());
        return;
    }

    if (args.has('init')){
        const [storePath, key] = args.getx('init', '-k')
        
        store.initialize({
            storePath,
            key,
            configure: args.has('-ac')
        });
    }

    if (args.has('save')){
        const [path, password, key, storePath] = args.getx("save", "-p", "-k", "-s", "-a");
        let generatedPassword;
        if (args.has('-g')){
            if (_g && isNaN(_g)){
                prnt(RED+"-g arguments expected to be of type int"+X)
                generatedPassword = Password.generateRandom(); 
            } 
            else {
                generatedPassword = Password.generateRandom(_g || 20); 
            } 
        }
        const isAddFields = args.has('-a'); 
        return await store.save({
            path, 
            password: password || generatedPassword, 
            key, 
            storePath, 
            isAddFields
        });  
    }

    if (args.has('ls')){
        store.list(args.get('ls')); 
    }

    if (args.has('get')){
        const [path, key, storePath] = args.getx('get','-k','-s'); 
        store.get({path, key, storePath})
    }

    if (args.has('config')){
        const [key, storePath] = args.getx('-k', '-s');
        return store.configure({key, storePath}); 
    }

    if (args.has('--remove-keystore')){
        const [key, storePath] = args.getx('-k', 'rm');
        return store.removeKeystore({key, storePath}); 
    }

    if (args.has('upload')){
        const [key, storePath] = args.getx('-k', 'upload');
        return store.upload({key, storePath});  
    }

    if (args.has('update')){
        const [path, key, storePath] = args.getx('update','-k','-s');
        const isAddFields = args.has('-a');
        return store.update({path, key, isAddFields, storePath});
    }

    if (args.has('test')){
        const [key] = args.getx('-k')
        store.test({key}); 
    }

    if (args.has('rm')){

    }
});

