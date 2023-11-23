import { spawnSync } from "child_process";
import readline from "readline";
import Path from "path"; 

export default class cli {
    static origdir = process.cwd();
    static run(cmd, args=[]) {
        const res = (args.length > 0)
            ? spawnSync(cmd, args)
            : spawnSync(cmd);
        const err = res.stderr;
        const out = res.stdout;
        if (err.toString()) {
            return err
        }
        else if (out) {
            const outstr = out.toString('ascii');
            return outstr;
        }
    }
    static git(...args) {
        cli.run('git', ...args);
    }
    static cd(dir) {
        process.chdir(dir);
    }
    static cdtemp(dir, callback) {
        process.chdir(dir);
        console.log('orig: ', cli.origdir)
        callback(process.cwd());
        process.chdir(cli.origdir);
    }
    static mkdir(...dirs) {
        dirs.forEach(dir => cli.run('mkdir', dir));
    }
    static read(prompt = "") {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(prompt, (input) => {
                rl.close();
                resolve(input);
            });
        })
    }
    static readpswd(prompt) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(prompt, (input) => {
                rl.history = rl.history.slice(1);
                rl.close();
                resolve(input);
            });
        })
        // return new Promise((resolve, reject) => {
        //     const rl = readline.createInterface({
        //         input: process.stdin,
        //         output: process.stdout
        //     });
        //     const stdin = process.openStdin();
        //     const oldon = process.stdin.on; 
        //     process.stdin.on('data', char => {
        //         char = char + '';
        //         switch (char) {
        //             case '\n':
        //             case '\r':
        //             case '\u0004':
        //                 stdin.pause();
        //                 break;
        //             default:
        //                 process.stdout.clearLine();
        //                 readline.cursorTo(process.stdout, 0);
        //                 process.stdout.write(prompt + Array(rl.line.length + 1).join('*'));
        //                 break;
        //         }
        //     });
        //     rl.question(prompt, value => {
        //         rl.history = rl.history.slice(1);
        //         process.stdin.on('data', on);
        //         rl.close(); 
        //         resolve(value);
        //     });
        // });
    }
    static relroot(){
        const str = Path.resolve("./");
        return "/" + str.split("/").slice(1,3).join("/")+"/"
    }
}
