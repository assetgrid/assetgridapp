using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using assetgrid_backend.Models;
using Microsoft.Extensions.Configuration;

namespace assetgrid_backend.Migrations.MySql
{
    public class AssetgridDbContextFactory : IDesignTimeDbContextFactory<AssetgridDbContext>
    {
        public AssetgridDbContext CreateDbContext(string[] args)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(System.AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json")
                .AddJsonFile("appsettings.Development.json")
                .Build();

            var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
            if (connectionString == null)
            {
                connectionString = configuration.GetConnectionString("MySQL");
            }

            var optionsBuilder = new DbContextOptionsBuilder<AssetgridDbContext>();
            optionsBuilder.UseMySql(connectionString,
                ServerVersion.AutoDetect(connectionString),
                options => options.MigrationsAssembly(typeof(Marker).Assembly.GetName().Name!));

            return new AssetgridDbContext(optionsBuilder.Options);
        }
    }
}
