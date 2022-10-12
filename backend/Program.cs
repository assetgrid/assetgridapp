using assetgrid_backend;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using static assetgrid_backend.Helpers.DatabaseProvider;
using System.Data.SqlTypes;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
{
    builder.Services.AddControllers();

    // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(setup =>
    {
        setup.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            In = ParameterLocation.Header,
            Description = "Please insert JWT with Bearer into field",
            Name = "Authorization",
            Type = SecuritySchemeType.ApiKey
        });
        setup.AddSecurityRequirement(new OpenApiSecurityRequirement {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                new string[] { }
            }
        });
    });

    builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IAccountService, AccountService>();
    builder.Services.AddSingleton<JwtSecret, JwtSecret>((serviceProvider) => JwtSecret.Get(Path.Combine(Environment.CurrentDirectory, "./jwt_secret.txt")));

#if DEBUG

    builder.Services.AddDbContext<AssetgridDbContext>(options =>
    {
        // Support legacy configuration from before multi DB support
        var legacyConnectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");

        var provider = legacyConnectionString == null ? builder.Configuration.GetValue("provider", Sqlite.Name) : Mysql.Name;
        if (provider == Sqlite.Name)
        {
            options.UseSqlite(
                builder.Configuration.GetConnectionString(Sqlite.Name)!,
                x => x.MigrationsAssembly(Sqlite.Assembly)
            );
        }
        if (provider == Mysql.Name)
        {
            var connectionString = legacyConnectionString ?? builder.Configuration.GetConnectionString(Mysql.Name);
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
                .EnableSensitiveDataLogging()
                .EnableDetailedErrors();
        }
    });
        

#else

    builder.Services.AddDbContext<AssetgridDbContext>(options =>
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

#endif
}

var app = builder.Build();

// configure HTTP request pipeline
{
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseStaticFiles();
    app.UseHttpsRedirection();
    app.UseRouting();

    // No issues with cross origin requests since we don't use cookies
    app.UseCors(x => x
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader()); 

    app.UseMiddleware<JwtMiddleware>();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapFallbackToFile("/dist/index.production.html");
    });

    // migrate any database changes on startup (includes initial db creation)
    using (var scope = app.Services.CreateScope())
    {
        var dataContext = scope.ServiceProvider.GetRequiredService<AssetgridDbContext>();
        dataContext.Database.Migrate();
    }
}

app.Run();