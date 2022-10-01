using assetgrid_backend;
using assetgrid_backend.Controllers;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using System;
using System.Web;
using Xunit;

namespace backend.unittests.Tests
{
    public class UserTests
    {
        public AssetgridDbContext Context { get; set; }
        public UserController UserController { get; set; }
        public UserService UserService { get; set; }

        public UserTests()
        {
            // Create DB context and connect
            var connection = new MySqlConnector.MySqlConnection("DataSource=:memory:");
            var options = new DbContextOptionsBuilder<AssetgridDbContext>()
                .UseInMemoryDatabase("Transaction" + Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            Context = new AssetgridDbContext(options.Options);

            // Create user and log in
            UserService = new UserService(JwtSecret.Get(), Context);
            UserController = new UserController(Context, UserService, Options.Create<ApiBehaviorOptions>(null!));
        }

        [Fact]
        public void CreateUserAndSignIn()
        {
            Assert.IsType<OkResult>(UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" }));

            // Only one user can be created with this method
            Assert.IsType<BadRequestResult>(UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" }));
            UserController.ModelState.Clear();

            // Cannot get user before signing in
            Assert.IsType<UnauthorizedResult>(UserController.GetUser());

            // User is null with wrong password
            var userResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test1" });
            Assert.IsType<BadRequestResult>(userResponse);
            UserController.ModelState.Clear();

            // User can sign in with correct password
            userResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
            Assert.IsType<OkObjectResult>(userResponse);
            var user = userResponse.OkValue<UserAuthenticatedResponse>();

            // User can be fetched
            UserService.MockUser = UserService.GetById(user.Id);
            var fetchedUser = UserController.GetUser().OkValue<UserAuthenticatedResponse>();

            Assert.NotNull(user);
            Assert.Equal(user!.Email, fetchedUser!.Email);
        }

        [Fact]
        public void UpdatePreferences()
        {
            // Create user and sign in
            UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            var user = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" }).OkValue<UserAuthenticatedResponse>();
            UserService.MockUser = UserService.GetById(user!.Id);

            user.Preferences.ThousandsSeparator = "TEST";

            UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, UserController.GetUser().OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DecimalSeparator = "TEST";

            UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, UserController.GetUser().OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DateFormat = "TEST";

            UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, UserController.GetUser().OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DateTimeFormat = "TEST";

            UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, UserController.GetUser().OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DecimalDigits = 3;

            UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, UserController.GetUser().OkValue<UserAuthenticatedResponse>().Preferences);
        }

        [Fact]
        public void ChangePassword()
        {
            // Create user and sign in
            UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            var user = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" }).OkValue<UserAuthenticatedResponse>();
            UserService.MockUser = UserService.GetById(user!.Id);

            // Change password
            var changeResult = UserController.ChangePassword(new UpdatePasswordModel { OldPassword = "test", NewPassword = "test2" });
            Assert.IsType<OkResult>(changeResult);

            // Can no longer sign in with old password
            var authenticateOldPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
            Assert.IsType<BadRequestResult>(authenticateOldPasswordResponse);
            UserController.ModelState.Clear();

            // Can sign in with new password
            var authenticateNewPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test2" });
            Assert.IsType<OkObjectResult>(authenticateNewPasswordResponse);
        }

        [Fact]
        public void ChangePasswordWrongOldPassword()
        {
            // Create user and sign in
            UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            var user = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" }).OkValue<UserAuthenticatedResponse>();
            UserService.MockUser = UserService.GetById(user!.Id);

            // Change password (fails due to wrong old password)
            var changeResult = UserController.ChangePassword(new UpdatePasswordModel { OldPassword = "test2", NewPassword = "test2" });
            Assert.IsType<BadRequestResult>(changeResult);
            UserController.ModelState.Clear();

            // Can not sign in with new password
            var authenticateOldPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test2" });
            Assert.IsType<BadRequestResult>(authenticateOldPasswordResponse);
            UserController.ModelState.Clear();

            // Can still sign in with old password
            var authenticateNewPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
            Assert.IsType<OkObjectResult>(authenticateNewPasswordResponse);
        }
    }
}