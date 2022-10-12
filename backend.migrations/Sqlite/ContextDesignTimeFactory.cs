using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using assetgrid_backend.Models;

namespace assetgrid_backend.Migrations.Sqlite
{
    public class AssetgridDbContextFactory : IDesignTimeDbContextFactory<AssetgridDbContext>
    {
        public AssetgridDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<AssetgridDbContext>();
            optionsBuilder.UseSqlite("Data Source=blog.db", x => x.MigrationsAssembly(typeof(Marker).Assembly.GetName().Name!));

            return new AssetgridDbContext(optionsBuilder.Options);
        }
    }
}
