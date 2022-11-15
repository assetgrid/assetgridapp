using assetgrid_backend;
using assetgrid_backend.Controllers;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace backend.unittests.Tests
{
    public class TaxonomyTests : TestBase
    {
        public ViewAccount AccountA;
        public ViewAccount AccountB;

        public TaxonomyTests() : base()
        {
            var accountModel = new ViewCreateAccount
            {
                Name = "A",
                Description = "Description",
                Identifiers = new List<string>(),
                Favorite = false,
                IncludeInNetWorth = false,
            };
            AccountA = AccountController.Create(accountModel).Result.OkValue<ViewAccount>();
            accountModel.Name = "B";
            AccountB = AccountController.Create(accountModel).Result.OkValue<ViewAccount>();
        }


        [Fact]
        public async void CategoryAutocomplete()
        {
            var otherUser = await UserService.CreateUser("test2", "test");
            var model = new ViewModifyTransaction
            {
                Total = -500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(-500, "", "Account A category") },
                MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>()
            };

            // Create account and transaction with User A
            await TransactionController.Create(model);
            Assert.Contains("Account A category", (await TaxonomyController.CategoryAutocomplete("cat")).OkValue<List<string>>());
            Assert.Contains("Account A category", (await TaxonomyController.CategoryAutocomplete("aCcOuNt")).OkValue<List<string>>());

            // No categories returned with user b
            UserService.MockUser = otherUser;
            Assert.Empty((await TaxonomyController.CategoryAutocomplete("cat")).OkValue<List<string>>());
            Assert.Empty((await TaxonomyController.CategoryAutocomplete("aCcOuNt")).OkValue<List<string>>());

            // Account A is shared with user B and it is suggested
            var UserAccount = new UserAccount {
                Account = Context.Accounts.Single(a => a.Id == AccountA.Id),
                AccountId = AccountA.Id,
                User = otherUser,
                UserId = otherUser.Id,
                Permissions = UserAccountPermissions.Read
            };
            Context.UserAccounts.Add(UserAccount);
            Context.SaveChanges();
            Assert.Contains("Account A category", (await TaxonomyController.CategoryAutocomplete("cat")).OkValue<List<string>>());
            Assert.Contains("Account A category", (await TaxonomyController.CategoryAutocomplete("aCcOuNt")).OkValue<List<string>>());

            // Account B is shared with user B and it is still suggested
            UserAccount.Account = Context.Accounts.Single(a => a.Id == AccountB.Id);
            UserAccount.AccountId = AccountB.Id;
            Context.SaveChanges();
            Assert.Contains("Account A category", (await TaxonomyController.CategoryAutocomplete("cat")).OkValue<List<string>>());
            Assert.Contains("Account A category", (await TaxonomyController.CategoryAutocomplete("aCcOuNt")).OkValue<List<string>>());
        }
    }
}
