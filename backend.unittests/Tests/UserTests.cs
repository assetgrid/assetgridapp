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
using assetgrid_backend.Models;
using System.Collections.Generic;
using System.Linq;

namespace backend.unittests.Tests
{
    public class UserTests
    {
        public AssetgridDbContext Context { get; set; }
        public UserController UserController { get; set; }
        public AccountController AccountController { get; set; }
        public TransactionController TransactionController { get; set; }
        public UserService UserService { get; set; }
        public AccountService AccountService { get; set; }

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
            AccountService = new AccountService(Context);
            UserController = new UserController(Context, UserService, AccountService, Options.Create<ApiBehaviorOptions>(null!));
            AccountController = new AccountController(Context, UserService, AccountService, Options.Create<ApiBehaviorOptions>(null!));
            TransactionController = new TransactionController(Context, UserService, Options.Create<ApiBehaviorOptions>(null!));
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

        [Fact]
        public void DeleteUser()
        {
            // Create users A and B and sign in with A
            var userA = UserService.CreateUser("A", "test");
            var userB = UserService.CreateUser("B", "test");
            UserService.MockUser = UserService.GetById(userA!.Id);

            // Update user preferences and verify that they were updated
            UserController.Preferences(new ViewPreferences(UserService.GetPreferences(userA)) { DecimalSeparator = "å" });
            Assert.Single(Context.UserPreferences.Where(x => x.UserId == userA.Id && x.DecimalSeparator == "å"));

            // Create some accounts
            var accountModel = new ViewCreateAccount
            {
                AccountNumber = "1234",
                Description = "Test account",
                Favorite = true,
                IncludeInNetWorth = false,
                Name = "My account"
            };
            var accountA0 = AccountController.Create(accountModel).OkValue<ViewAccount>();
            var accountA1 = AccountController.Create(accountModel).OkValue<ViewAccount>();
            var accountABAll = AccountController.Create(accountModel).OkValue<ViewAccount>();
            var accountABWrite = AccountController.Create(accountModel).OkValue<ViewAccount>();

            // Share the AB accounts with user B and give correct permission
            Context.UserAccounts.Add(new UserAccount { UserId = userB.Id, AccountId = accountABAll.Id, Permissions = UserAccountPermissions.All });
            Context.UserAccounts.Add(new UserAccount { UserId = userB.Id, AccountId = accountABWrite.Id, Permissions = UserAccountPermissions.ModifyTransactions });

            // Create some accounts as user B
            UserService.MockUser = UserService.GetById(userB!.Id);
            var accountB0 = AccountController.Create(accountModel).OkValue<ViewAccount>();
            var accountB1 = AccountController.Create(accountModel).OkValue<ViewAccount>();

            // Create transactions
            var createTransaction = (int? sourceId, int? destinationId) => TransactionController.Create(new ViewCreateTransaction
            {
                SourceId = sourceId,
                DestinationId = destinationId,
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                Total = 100,
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: 120, description: "Line 1"),
                    new ViewTransactionLine(amount: -20, description: "Line 2"),
                }
            }).OkValue<ViewTransaction>();

            // These transactions will not be deleted, when the user is deleted
            var keptTransactions = new[]
            {
                createTransaction(accountB0.Id, accountB1.Id),
                createTransaction(accountB0.Id, null),
                createTransaction(null, accountB0.Id),
                createTransaction(accountABWrite.Id, accountB0.Id),
                createTransaction(accountABWrite.Id, accountABAll.Id),
            };
            UserService.MockUser = userA;
            var deletedTransactions = new[]
            {
                createTransaction(accountA0.Id, accountA1.Id),
                createTransaction(accountA0.Id, null),
                createTransaction(null, accountABWrite.Id),
                createTransaction(accountABWrite.Id, null),
            };

            // Delete the user
            var result = UserController.Delete();
            Assert.IsType<OkResult>(result);

            // Verify that the user preferences and useraccounts have been deleted
            Assert.Empty(Context.Users.Where(x => x.Id == userA.Id));
            Assert.Empty(Context.UserPreferences.Where(x => x.UserId == userA.Id));
            Assert.Empty(Context.UserAccounts.Where(x => x.UserId == userA.Id));

            // Verify that the correct transactions are left
            foreach (var transaction in keptTransactions)
            {
                Assert.Single(Context.Transactions.Where(t => t.Id == transaction.Id));
            }
            foreach (var transaction in deletedTransactions)
            {
                Assert.Empty(Context.Transactions.Where(t => t.Id == transaction.Id));
            }

            // Verify that the correct accounts are left (B has owner permissions to these accounts)
            Assert.Single(Context.Accounts.Where(x => x.Id == accountB0.Id));
            Assert.Single(Context.Accounts.Where(x => x.Id == accountB1.Id));
            Assert.Single(Context.Accounts.Where(x => x.Id == accountABAll.Id));

            // Verify that accounts that should be deleted are deleted (only A has all permissions to these accounts
            Assert.Empty(Context.Accounts.Where(x => x.Id == accountA0.Id));
            Assert.Empty(Context.Accounts.Where(x => x.Id == accountA1.Id));
            Assert.Empty(Context.Accounts.Where(x => x.Id == accountABWrite.Id));
        }
    }
}