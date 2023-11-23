# Snakstore
Local password manager

## Initializing Key Store
```bash
ks save <path> [options] 
```
Valid Options:
* -k  : Specify encryption key
* -ac : Add configuration

## Saving Passwords
```bash
ks save <password_path> [options] 
```
Valid Options:
* -k : Specify encryption key
* -p : Specify password
* -a : Add additional fields

## Getting Passwords
```bash
ks get <password_path>
```
Valid Options:
* -k : Specify encryption key

