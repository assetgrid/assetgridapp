using assetgrid_backend;
using assetgrid_backend.Controllers;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Web;
using Xunit;

namespace backend.unittests
{
    public class UserTests
    {
        [Fact]
        public void CreateUserAndSignIn()
        {
            var connection = new MySqlConnector.MySqlConnection("DataSource=:memory:");
            var options = new DbContextOptionsBuilder<AssetgridDbContext>()
                .UseInMemoryDatabase("User.CreateUserAndSignIn");
            using (var context = new AssetgridDbContext(options.Options))
            {
                var userService = new UserService(JwtSecret.Get(), context);
                var controller = new UserController(context, userService);

                controller.CreateInitial("test", "test");

                // Only one user can be created with this method
                Assert.Throws<InvalidOperationException>(() => controller.CreateInitial("test", "test"));

                // Cannot get user before signing in
                Assert.Null(controller.GetUser());

                // User is null with wrong password
                var user = controller.Authenticate(new AuthenticateModel { Email = "test", Password = "test1" });
                Assert.Null(user);

                // User can sign in with correct password
                user = controller.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
                Assert.NotNull(user);

                // User can be fetched
                userService.MockUser = userService.GetById(user!.Id);
                var fetchedUser = controller.GetUser();

                Assert.NotNull(user);
                Assert.Equal(user!.Email, fetchedUser!.Email);
            }
        }

        [Fact]
        public void UpdatePreferences()
        {
            var connection = new MySqlConnector.MySqlConnection("DataSource=:memory:");
            var options = new DbContextOptionsBuilder<AssetgridDbContext>()
                .UseInMemoryDatabase("User.UpdatePreferences");
            using (var context = new AssetgridDbContext(options.Options))
            {
                var userService = new UserService(JwtSecret.Get(), context);
                var controller = new UserController(context, userService);

                // Create user and sign in
                controller.CreateInitial("test", "test");
                var user = controller.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
                userService.MockUser = userService.GetById(user!.Id);

                user.Preferences.ThousandsSeparator = "TEST";

                controller.Preferences(user.Preferences);
                Assert.Equivalent(user.Preferences, controller.GetUser()?.Preferences);

                user.Preferences.DecimalSeparator = "TEST";

                controller.Preferences(user.Preferences);
                Assert.Equivalent(user.Preferences, controller.GetUser()?.Preferences);

                user.Preferences.DateFormat = "TEST";

                controller.Preferences(user.Preferences);
                Assert.Equivalent(user.Preferences, controller.GetUser()?.Preferences);

                user.Preferences.DateTimeFormat = "TEST";

                controller.Preferences(user.Preferences);
                Assert.Equivalent(user.Preferences, controller.GetUser()?.Preferences);

                user.Preferences.DecimalDigits = 3;

                controller.Preferences(user.Preferences);
                Assert.Equivalent(user.Preferences, controller.GetUser()?.Preferences);
            }
        }
    }
}