# Деплой на Timeweb VPS/Cloud

Проект нужно размещать как Node.js приложение. Обычный статический хостинг не подойдет, потому что сервер запускается через `node server.js`, а данные лежат в SQLite.

## 1. Подготовить сервер

На VPS/Cloud сервере установить Node.js 22, Git, Nginx и PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
```

Проверить версии:

```bash
node -v
npm -v
pm2 -v
```

## 2. Загрузить проект

```bash
cd /var/www
sudo git clone https://github.com/testroyall-hash/ordersapp.git
sudo chown -R $USER:$USER /var/www/ordersapp
cd /var/www/ordersapp
npm install
```

## 3. Подготовить постоянную базу

SQLite-файл лучше хранить вне папки проекта, чтобы обновление кода не затерло данные.

```bash
sudo mkdir -p /var/data/ordersapp
sudo chown -R $USER:$USER /var/data/ordersapp
cp db.sqlite3 /var/data/ordersapp/db.sqlite3
```

## 4. Запустить приложение через PM2

```bash
cd /var/www/ordersapp
DB_PATH=/var/data/ordersapp/db.sqlite3 PORT=3000 pm2 start server.js --name ordersapp
pm2 save
pm2 startup
```

Команда `pm2 startup` выведет еще одну команду с `sudo`; ее нужно скопировать и выполнить, чтобы приложение запускалось после перезагрузки сервера.

Проверка:

```bash
pm2 status
pm2 logs ordersapp
```

## 5. Настроить Nginx

Создать файл:

```bash
sudo nano /etc/nginx/sites-available/ordersapp
```

Вставить конфиг, заменив `example.ru` на домен:

```nginx
server {
    listen 80;
    server_name example.ru www.example.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Включить сайт:

```bash
sudo ln -s /etc/nginx/sites-available/ordersapp /etc/nginx/sites-enabled/ordersapp
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Привязать домен

В DNS домена указать A-запись:

```text
@      A      IP_СЕРВЕРА
www    A      IP_СЕРВЕРА
```

После обновления DNS сайт должен открыться по домену.

## 7. HTTPS

После того как домен начал открываться, поставить SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.ru -d www.example.ru
```

## Обновление проекта

```bash
cd /var/www/ordersapp
git pull
npm install
pm2 restart ordersapp
```
