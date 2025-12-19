# Use the official .NET image to build the app
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy the project file and restore dependencies
COPY ["ASPNETCORE.csproj", "."]
RUN dotnet restore

# Copy the rest of the application code
COPY . .
RUN dotnet publish -c Release -o /app/out

# Build the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/out .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ASPNETCORE.dll"]
