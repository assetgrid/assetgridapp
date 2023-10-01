FROM mcr.microsoft.com/dotnet/aspnet:7.0-bullseye-slim

# COPY dependencies
COPY ./backend/bin/Release/net7.0 /usr/share/assetgrid/
COPY ./frontend/dist.production /usr/share/assetgrid/wwwroot/dist/

WORKDIR /usr/share/assetgrid

EXPOSE 8080

CMD ["dotnet", "backend.dll", "--urls=http://0.0.0.0:8080/"]
