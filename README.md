# 用户系统 + 后台管理（含 IP 记录）

一个完整的最小可用系统：用户可以注册/登录，后台管理员可以查看所有用户数据，包括注册 IP、最近登录 IP、登录历史，并可对用户执行封禁 / 解封 / 删除。

## 技术栈
- 后端：Node.js + Express
- 数据存储：**纯 JS 实现的 JSON 文件数据库**（`store.js`），零原生依赖，Termux / Windows / Linux / macOS 通用
- 鉴权：JWT（用户与管理员分别签发、分别校验）
- 密码：bcryptjs 加密存储
- 前端：原生 HTML/CSS/JS（无需构建工具，双击即可理解全部逻辑）

> 之前的版本用 `better-sqlite3`，它需要在安装时编译原生模块，在 Termux 等环境里经常因为缺 `build-essential` / `python` 装不上。现在换成纯 JS 的 JSON 文件存储，所有依赖包（express、cors、dotenv、bcryptjs、jsonwebtoken）都是纯 JS，`npm install` 不需要任何编译工具链，Termux 上可以直接跑。数据量在几万用户级别以内完全够用；如果以后要支撑更大并发，可以再迁移到 MySQL/PostgreSQL。

## 目录结构
```
user-admin-system/
├── server.js              # 入口
├── store.js                # 纯 JS 数据存储（JSON 文件），代替原来的数据库
├── data/db.json            # 首次运行自动生成的数据文件
├── middleware/auth.js     # JWT 鉴权中间件
├── utils/getClientIp.js   # 获取客户端真实 IP
├── routes/auth.js         # 用户注册/登录/个人信息
├── routes/admin.js        # 管理员登录 + 用户管理接口
├── public/
│   ├── index.html         # 用户注册/登录页
│   ├── admin.html         # 后台管理页
│   ├── css/style.css
│   └── js/main.js, admin.js
├── package.json
└── .env.example
```

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量（复制并按需修改）：
   ```bash
   cp .env.example .env
   ```
   `.env` 中可修改：
   - `JWT_SECRET`：JWT 签名密钥，**上线前务必改成随机长字符串**
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`：后台管理员登录账号密码

3. 启动服务：
   ```bash
   npm start
   ```
   看到 `服务已启动: http://localhost:3000` 即成功。

4. 访问：
   - 用户注册/登录页：http://localhost:3000/
   - 后台管理页：http://localhost:3000/admin.html （使用 .env 中配置的管理员账号密码登录）

首次运行会自动在项目根目录生成 `data/db.json` 文件，作为存放所有用户与登录记录的数据文件，无需任何建表操作。

## 在 Termux（安卓手机）中运行

1. 先装好 Node.js（Termux 自带的 apt 源里就有，不需要编译）：
   ```bash
   pkg update
   pkg install nodejs
   ```
   装完用 `node -v` 确认能正常输出版本号。

2. 把项目文件传进手机。任选一种：
   - 用 `pkg install git` 后 `git clone` 你自己的仓库；
   - 或者用 U 盘/传输工具把整个 `user-admin-system` 文件夹拷进手机，再在 Termux 里 `cd` 过去；
   - 或者先执行一次 `termux-setup-storage` 授权，把文件放进手机「下载」目录，再从 `~/storage/downloads/` 里 `cp -r` 到 Termux 的 home 目录（推荐放到 Termux 自己的目录下运行，读写速度更稳定）。

3. 安装依赖、启动服务，和普通电脑上完全一样：
   ```bash
   cd user-admin-system
   npm install
   cp .env.example .env
   npm start
   ```
   本项目已不依赖任何需要编译的原生模块，所以这一步不会再出现 `node-gyp` / `python` 报错。

4. 手机上打开浏览器访问 `http://127.0.0.1:3000` 即可看到用户注册/登录页；`http://127.0.0.1:3000/admin.html` 是后台管理页。

5. 几个 Termux 特有的小提示：
   - 关闭 Termux App 或锁屏一段时间后，系统可能会杀掉后台进程。想长时间挂着跑，执行 `termux-wake-lock`（需要先 `pkg install termux-api` 并安装配套的 Termux:API App）防止被系统休眠杀掉。
   - 如果想让**同一 WiFi 下的其他设备**（比如电脑）也能访问这个后台，把 `.env` 里的端口保持默认，然后在其他设备浏览器里访问 `http://手机的局域网IP:3000`（手机 IP 可以在 Termux 里用 `ip addr` 或手机 WiFi 设置里看到）。手机连的是移动数据网络时通常处于运营商 NAT 之后，无法直接被外部访问，这属于网络环境限制，不是代码问题。
   - Termux 的存储在卸载 App 或清除数据时会被清空，记得定期把 `data/db.json` 备份到手机相册/云盘之外的地方。

## 关于 IP 记录

- 服务端在 `server.js` 中已开启 `app.set('trust proxy', true)`，如果你把它部署在 Nginx / 云负载均衡 / CDN 后面，请确保这些前置代理会正确转发 `X-Forwarded-For` 请求头，否则记录到的会是代理服务器的 IP。
- 本地开发环境下访问到的通常是 `127.0.0.1` 或 `::1`，这是正常现象，部署到公网后会记录到真实公网 IP。
- 每次登录（无论成功或失败）都会写入 `login_logs` 表，在后台"详情"弹窗中可查看某个用户最近 50 次登录所使用的 IP，便于排查异地登录、撞库等异常情况。

## 接口一览

**用户端** `/api/auth`
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /register | 注册 |
| POST | /login | 登录，返回 JWT |
| GET  | /me | 获取当前登录用户信息（需带 Token） |

**管理端** `/api/admin`
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /login | 管理员登录，返回 JWT |
| GET | /stats | 总览统计 |
| GET | /users?keyword=&page=&pageSize= | 用户列表（支持按用户名/IP 搜索） |
| GET | /users/:id | 用户详情 + 登录 IP 日志 |
| PATCH | /users/:id/ban | 封禁/解封 |
| DELETE | /users/:id | 删除用户 |

## 安全提示（生产环境上线前必读）
1. 务必修改 `.env` 中的 `JWT_SECRET` 与管理员密码，不要使用默认值。
2. 建议在管理端接口前再加一层 IP 白名单或二次验证（如短信/邮箱验证码），本项目仅提供最基础的账号密码鉴权。
3. 建议全站启用 HTTPS，避免 Token 和密码在传输过程中被窃取。
4. 生产环境的 `data/db.json` 文件请做好定期备份；如并发量较大或用户量上到十万级以上，建议迁移到 MySQL/PostgreSQL。
5. 请遵守所在地区关于个人数据（包括 IP 地址）收集与留存的法律法规，并在你的产品隐私政策中如实告知用户。
