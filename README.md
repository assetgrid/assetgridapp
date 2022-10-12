Assetgrid is a personal finance platform. It is our aim to make a tool that is flexible and powerful and can accomodate many use-cases with a UI that doesn't get in your way. 

Assetgrid will support budgets in an upcoming release, but Assetgrid is not built around budgets. Assetgrid is meant to be a tool to organize and extract information from personal finance data, whether you want to make a budget, keep track of unpaid bills, keep track of receipts, investments, extract random statistics about your spending habits or all that at once.

Assetgrid is based on the following workflow:

1. **Import your data**. Currently we support CSV imports as well as manual entry.
2. **Categorize and process your data**. At this point in time Assetgrid only supports assigning categories to transactions but in the future we plan on adding custom metadata and tags, so you can enrich your financial information with other data like receipts, notes, relations. You will then be able to use query and plot your financials by this information.

    In the future we will implement automations, so that you can configure Assetgrid to automatically process your transactions.

3. **Browse your data**. Assetgrid will have a powerful report tool that allows you to extract whatever information you want from your financial data. Currently we support some basic net worth/cash flow calculations, but in the future we will implement budgets and customizable reports.

View [screenshots 📸](https://assetgrid.app/screenshots)

# Getting started

For information on how to get started using Assetgrid, check our website https://assetgrid.app

# Install Assetgrid

## Docker

We recommend that you use our docker image which is preconfigured. Assetgrid uses a MySQL/MariaDB database, which you will need to run and configure. The following examples assumes that a database exist with the name “assetgrid” and a user with the name “assetgrid” and the password “secret”.

Example docker-compose.yml file:

```yaml
version: "3.1"
  services:
    db:
      image: mariadb:latest
      container_name: mariadb
      volumes:
        -  ./mariadb:/var/lib/mysql
      environment:
        MYSQL_ROOT_PASSWORD: secret

    assetgrid:
      image: assetgrid/assetgrid
      container_name: assetgrid
      links:
        - db:db
      environment:
        CONNECTION_STRING: "Server=db;Database=assetgrid;Uid=assetgrid;Pwd=secret"
      ports:
        - 80:8080
```

Example docker run commands:

    docker run -v ./mariadb:/var/lib/mysql --env "MYSQL_ROOT_PASSWORD=secret" --name db mariadb:latest
    docker run --link db --env "CONNECTION_STRING='Server=db;Database=assetgrid;Uid=assetgrid;Pwd=secret'" -p 80:8080 --name assetgrid assetgrid/assetgrid

## Custom installation

To install Assetgrid without docker is a bit more involved. You will first need to install the .NET core runtime.

You then need to get Assetgrid binaries. You can either clone the github repository and build it from source or find the “Build” action on Github and download the file/artifact called “Docker” which will contain a precompiled version of the program.

No matter if you build from source or download the precompiled file, you will end up with two folders: frontend/dist.production and backend/bin/Release/net6.0. You must copy the backend folder to the desired location. You must then copy the frontend folder to a subfolder of the backend folder ./wwwroot/dist.

Now you can run the application by switching to the backend directory and running

dotnet backend.dll --urls=http://0.0.0.0:8080/

You can change the —urls parameter to run Assetgrid on a different port.

## Building from source

We have included a Visual Studio Code launch config and some tasks to ease building the project.

### Backend

To run the backend you must first copy /backend/appsettings.json to /backend/appsettings.development.json and update this with database information. You must run a mysql/mariadb server separately. After doing this, you can just use the Visual Studio code launch config to run the project. Alternatively you can build it and run it with the dotnet command from the dotnet SDK.

### Frontend

CD into the frontend folder and run 'npm install'. You can then run the "watch frontend" task in VS code which will automatically compile and serve the frontend.
In the /frontend/src/lib/apiClient.ts file you can change which URL the frontend expects the backend to be at.
