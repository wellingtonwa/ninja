# ninja
Projeto para auxiliar as tarefas diárias da equipe de Dev

## Instalando

### Clone o repositório

```
git clone https://github.com/wellington/ninja.git ninja

cd ninja

npm install
```

### Criando pastas necessárias

``` 
# crie as pastas na raiz do projeto
# Esta pasta é utilizada para fazer o download dos arquivos de backup
mkdir uploads;
# Esta pasta é utilizada para armazenar o token de acesso ao google docs
mkdir configs && cd configs && mkdir files
```

### Configurando variável de ambiente

Adicione uma variável de ambiente chamada `PGPASSWORD` e no valor informe a senha do usuário `postgres`. Este passo é para evitar que o node fique solicitando a senha do postgres quando for restaurar um backup.

Para adicionar a variável de ambiente você deve abrir um terminal (cmd ou bash) como administrador e executar o seguinte comando:
```
setx PGPASSWORD "MinhaSenhaDoPostgres"  
```

### Configurações do projeto

Na raiz do projeto há um arquivo `.env.example`. Pegue este arquivo remoneie removendo o trecho `.example` dele, o arquivo deve ter o nome `.env`somente.
Depois renomear o arquivo, preencha as informações dele;

```
DB_USER=myUser -> Usuário do banco de dados
DB_PASSWORD=myPassword -> senha do usuário do banco de dados
DB_HOST=localhost -> Endereço do banco de dados
DB_PORT=5432 -> porta do banco de dados
DB_DATABASE=postgres -> nome da base do banco de dados
DB_PREFIX=calima_% -> prefixo para os nomes dos bancos de dados
IGNORE_DBS='postgres','calima','calima_testes','calima_qa' -> bancos que não devem ser apagados ou listados
PATH_CLEAN=C:/Users/well/Downloads/ -> endereço da pasta que o ninja deve usar para limpar
GOOGLEDOCS_CLIENTID=loremipsum -> ID do cliente da API do Google Docs
GOOGLEDOCS_CLIENTSECRET=loremipsum -> Senha do cliente da API do Google Docs
GOOGLEDOCS_DOCUMENTID=loremipsum -> Identificador do Documento do Google docs
MANTIS_USER=loremipsum -> Seu usuário do Mantis
MANTIS_PASSWORD=loremipsum -> Sua senha do Mantis
MANTIS_BASE_URL=https://loremipsum.com.br -> O endereço base para o sistema do Mantis

```
## Executando o Ninja

Abra um terminal `cmd`, `bash`ou similar e execute o seguinte comando.

```
node ./src/index.js
```
