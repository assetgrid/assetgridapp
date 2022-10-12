using System.Data.SqlTypes;

namespace assetgrid_backend.Helpers
{
    public record DatabaseProvider(string Name, string Assembly)
    {
        public static DatabaseProvider Sqlite = new(nameof(Sqlite), typeof(Migrations.Sqlite.Marker).Assembly.GetName().Name!);
        public static DatabaseProvider Mysql = new(nameof(Mysql), typeof(Migrations.MySql.Marker).Assembly.GetName().Name!);
    }
}
