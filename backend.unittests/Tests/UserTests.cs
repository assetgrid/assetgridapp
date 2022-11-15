using assetgrid_backend;
using assetgrid_backend.Controllers;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models.ViewModels;
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
using Microsoft.Extensions.Logging;

namespace backend.unittests.Tests
{
    public class UserTests : TestBase
    {
        public UserTests() : base()
        {
            UserService.MockUser = UserA;
            UserController.Delete().Wait();
            UserService.MockUser = UserB;
            UserController.Delete().Wait();
            UserService.MockUser = null;
        }

        [Fact]
        public async void CreateUserAndSignIn()
        {
            Assert.IsType<OkResult>(await UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" }));

            // Only one user can be created with this method
            Assert.IsType<BadRequestResult>(await UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" }));
            UserController.ModelState.Clear();

            // Cannot get user before signing in
            Assert.IsType<UnauthorizedResult>(await UserController.GetUser());

            // User is null with wrong password
            var userResponse = await UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test1" });
            Assert.IsType<BadRequestResult>(userResponse);
            UserController.ModelState.Clear();

            // User can sign in with correct password
            userResponse = await UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
            Assert.IsType<OkObjectResult>(userResponse);
            var user = userResponse.OkValue<UserAuthenticatedResponse>();

            // User can be fetched
            UserService.MockUser = await UserService.GetById(user.Id);
            var fetchedUser = (await UserController.GetUser()).OkValue<UserAuthenticatedResponse>();

            Assert.NotNull(user);
            Assert.Equal(user!.Email, fetchedUser!.Email);
        }

        [Fact]
        public async void UpdatePreferences()
        {
            // Create user and sign in
            await UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            var user = (await UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" })).OkValue<UserAuthenticatedResponse>();
            UserService.MockUser = await UserService.GetById(user!.Id);

            user.Preferences.ThousandsSeparator = "TEST";

            await UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, (await UserController.GetUser()).OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DecimalSeparator = "TEST";

            await UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, (await UserController.GetUser()).OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DateFormat = "TEST";

            await UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, (await UserController.GetUser()).OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DateTimeFormat = "TEST";

            await UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, (await UserController.GetUser()).OkValue<UserAuthenticatedResponse>().Preferences);

            user.Preferences.DecimalDigits = 3;

            await UserController.Preferences(user.Preferences);
            Assert.Equivalent(user.Preferences, (await UserController.GetUser()).OkValue<UserAuthenticatedResponse>().Preferences);
        }

        [Fact]
        public async void ChangePassword()
        {
            // Create user and sign in
            await UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            var user = (await UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" })).OkValue<UserAuthenticatedResponse>();
            UserService.MockUser = await UserService.GetById(user!.Id);

            // Change password
            var changeResult = UserController.ChangePassword(new UpdatePasswordModel { OldPassword = "test", NewPassword = "test2" });
            Assert.IsType<OkResult>(await changeResult);

            // Can no longer sign in with old password
            var authenticateOldPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
            Assert.IsType<BadRequestResult>(await authenticateOldPasswordResponse);
            UserController.ModelState.Clear();

            // Can sign in with new password
            var authenticateNewPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test2" });
            Assert.IsType<OkObjectResult>(await authenticateNewPasswordResponse);
        }

        [Fact]
        public async void ChangePasswordWrongOldPassword()
        {
            // Create user and sign in
            await UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            var user = (await UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" })).OkValue<UserAuthenticatedResponse>();
            UserService.MockUser = await UserService.GetById(user!.Id);

            // Change password (fails due to wrong old password)
            var changeResult = UserController.ChangePassword(new UpdatePasswordModel { OldPassword = "test2", NewPassword = "test2" });
            Assert.IsType<BadRequestResult>(await changeResult);
            UserController.ModelState.Clear();

            // Can not sign in with new password
            var authenticateOldPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test2" });
            Assert.IsType<BadRequestResult>(await authenticateOldPasswordResponse);
            UserController.ModelState.Clear();

            // Can still sign in with old password
            var authenticateNewPasswordResponse = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" });
            Assert.IsType<OkObjectResult>(await authenticateNewPasswordResponse);
        }

        [Fact]
        public async void DeleteUser()
        {
            // Create users A and B and sign in with A
            var userA = await UserService.CreateUser("A", "test");
            var userB = await UserService.CreateUser("B", "test");
            UserService.MockUser = await UserService.GetById(userA!.Id);

            // Update user preferences and verify that they were updated
            await UserController.Preferences(new ViewPreferences(UserService.GetPreferences(userA)) { DecimalSeparator = "X" });
            Assert.Single(Context.UserPreferences.Where(x => x.UserId == userA.Id && x.DecimalSeparator == "X"));

            // Create some accounts
            var accountModel = new ViewCreateAccount
            {
                Identifiers = new List<string> { "test" },
                Description = "Test account",
                Favorite = true,
                IncludeInNetWorth = false,
                Name = "My account"
            };
            var accountA0 = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();
            var accountA1 = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();
            var accountABAll = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();
            var accountABWrite = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();

            // Share the AB accounts with user B and give correct permission
            Context.UserAccounts.Add(new UserAccount {
                UserId = userB.Id,
                User = userB,
                AccountId = accountABAll.Id,
                Account = Context.Accounts.Single(x => x.Id == accountABAll.Id),
                Permissions = UserAccountPermissions.All
            });
            Context.UserAccounts.Add(new UserAccount {
                UserId = userB.Id,
                User = userB,
                AccountId = accountABWrite.Id,
                Account = Context.Accounts.Single(x => x.Id == accountABWrite.Id),
                Permissions = UserAccountPermissions.ModifyTransactions
            });

            // Create some accounts as user B
            UserService.MockUser = await UserService.GetById(userB!.Id);
            var accountB0 = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();
            var accountB1 = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();

            // Create transactions
            var createTransaction = async (int? sourceId, int? destinationId) => (await TransactionController.Create(new ViewModifyTransaction
            {
                SourceId = sourceId,
                DestinationId = destinationId,
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                Total = 100,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: 120, description: "Line 1", ""),
                    new ViewTransactionLine(amount: -20, description: "Line 2", ""),
                },
                MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>(),
            })).OkValue<ViewTransaction>();

            // These transactions will not be deleted, when the user is deleted
            var keptTransactions = new[]
            {
                await createTransaction(accountB0.Id, accountB1.Id),
                await createTransaction(accountB0.Id, null),
                await createTransaction(null, accountB0.Id),
                await createTransaction(accountABWrite.Id, accountB0.Id),
                await createTransaction(accountABWrite.Id, accountABAll.Id),
            };
            UserService.MockUser = userA;
            var deletedTransactions = new[]
            {
                await createTransaction(accountA0.Id, accountA1.Id),
                await createTransaction(accountA0.Id, null),
                await createTransaction(null, accountABWrite.Id),
                await createTransaction(accountABWrite.Id, null),
            };

            // Delete the user
            var result = UserController.Delete();
            Assert.IsType<OkResult>(await result);

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