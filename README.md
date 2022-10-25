# Usage

1. npm i -g @utt/s3-deploy
2. `cd` into a static website directory (make sure the directory named as your domain name)
3. run `s3-deploy` and choose `Setup Cloudflare auth`, and insert the name of the account and the token
4. run `s3-deploy` and choose `Setup AWS auth`, and insert the **accessKey** of the **secretKey**
5. run `s3-deploy` again and select Setup website
6. run `s3-deploy` and select Deploy

## TODO

- [x] add choices when setup website, if to set cloudflare alone or aws alone
