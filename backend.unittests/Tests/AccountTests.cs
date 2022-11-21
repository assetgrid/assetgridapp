using assetgrid_backend;
using assetgrid_backend.Controllers;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Web;
using Xunit;
using assetgrid_backend.models.Search;
using Microsoft.Extensions.Logging;
using Moq;
using Microsoft.EntityFrameworkCore.InMemory.Internal;
using Microsoft.Extensions.Configuration;

namespace backend.unittests.Tests
{
    public class AccountTests : TestBase, IDisposable
    {
        public AccountTests() : base()
        {

        }

        public void Dispose()
        {
            Context.Dispose();
        }

        [Fact]
        public async void CreateAccountUpdateAndDelete()
        {
            var model = new ViewCreateAccount
            {
                Identifiers = new List<string> { "test" },
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var createResult = (await AccountController.Create(model)).OkValue<ViewAccount>();
            Assert.NotNull(createResult);
            Assert.Equal(createResult.Identifiers, model.Identifiers);
            Assert.Equal(createResult.Description, model.Description);
            Assert.Equal(createResult.Favorite, model.Favorite);
            Assert.Equal(createResult.IncludeInNetWorth, model.IncludeInNetWorth);
            Assert.Equal(createResult.Name, model.Name);
            Assert.Equal(ViewAccount.AccountPermissions.All, createResult.Permissions);

            // Verify that the user has the correct permission
            Assert.NotNull(Context.UserAccounts
                .SingleOrDefault(account => account.UserId == UserA.Id &&
                    account.AccountId == createResult.Id &&
                    account.Permissions == UserAccountPermissions.All &&
                    account.Favorite == model.Favorite &&
                    account.IncludeInNetWorth == model.IncludeInNetWorth));

            // Get account
            var getResult = (await AccountController.Get(createResult.Id)).OkValue<ViewAccount>();
            Assert.NotNull(getResult);
            Assert.Equal(JsonConvert.SerializeObject(createResult), JsonConvert.SerializeObject(getResult));

            // Update account properties
            getResult.Identifiers = new List<string> { "test2" };
            getResult.Description = "New description";
            getResult.Name = "Another name";

            var updateResult = (await AccountController.Update(getResult.Id, getResult)).OkValue<ViewAccount>();
            Assert.NotNull(updateResult);
            Assert.Equivalent(getResult, updateResult);

            // Update UserAccount properties
            updateResult.Favorite = !updateResult.Favorite;
            updateResult.IncludeInNetWorth = !updateResult.IncludeInNetWorth;

            var updateResult2 = (await AccountController.Update(updateResult.Id, updateResult)).OkValue<ViewAccount>();
            Assert.NotNull(updateResult2);
            Assert.Equivalent(updateResult, updateResult2);

            // Delete the account
            await AccountController.Delete(updateResult2.Id);
        }

        [Theory]
        [InlineData(null)]
        [InlineData(UserAccountPermissions.Read)]
        [InlineData(UserAccountPermissions.ModifyTransactions)]
        [InlineData(UserAccountPermissions.All)]
        public async void GetUpdateDeleteSharedAccount(UserAccountPermissions? permissions)
        {
            var model = new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = (await AccountController.Create(model)).OkValue<ViewAccount>();
            var userAccount = Context.UserAccounts.SingleOrDefault(account => account.UserId == UserA.Id && account.AccountId == testAccount.Id);
            Assert.NotNull(userAccount);

            if (permissions == null)
            {
                Context.Remove(userAccount);
            }
            else
            {
                userAccount.Permissions = permissions.Value;
            }
            Context.SaveChanges();

            // Get the account
            if (permissions == null)
            {
                Assert.IsType<NotFoundResult>(await AccountController.Get(testAccount.Id));
            }
            else
            {
                testAccount.Permissions = ViewAccount.PermissionsFromDbPermissions(permissions.Value);
                Assert.Equivalent(testAccount, (await AccountController.Get(testAccount.Id)).OkValue<ViewAccount>());
            }

            // Update the account
            testAccount.Name = "New name";
            if (permissions == UserAccountPermissions.All)
            {

                var updateResult = (await AccountController.Update(testAccount.Id, testAccount)).OkValue<ViewAccount>();
                Assert.Equivalent(updateResult, testAccount);
                await AccountController.Delete(updateResult.Id);
            }
            else
            {
                if (permissions == null)
                {
                    Assert.IsType<NotFoundResult>(await AccountController.Update(testAccount.Id, testAccount));
                    Assert.IsType<NotFoundResult>(await AccountController.Delete(testAccount.Id));
                }
                else
                {
                    Assert.IsType<ForbidResult>(await AccountController.Update(testAccount.Id, testAccount));
                    Assert.IsType<ForbidResult>(await AccountController.Delete(testAccount.Id));
                }
            }
        }

        [Fact]
        public async void SearchById()
        {
            var model = new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "A"
            };

            // Create account
            var accountA = (await AccountController.Create(model)).OkValue<ViewAccount>();
            model.Name = "B";
            var accountB = (await AccountController.Create(model)).OkValue<ViewAccount>();
            model.Name = "No permission";
            var accountNoPermissions = (await AccountController.Create(model)).OkValue<ViewAccount>();
            var userAccount = Context.UserAccounts.SingleOrDefault(account => account.UserId == UserA.Id && account.AccountId == accountNoPermissions.Id)!;
            Context.Remove(userAccount);
            Context.SaveChanges();

            var query = new ViewSearch
            {
                From = 0,
                To = 20,
                OrderByColumn = "Description",
                Descending = false,
                Query = new SearchGroup
                {
                    Type = SearchGroupType.Query,
                    Query = new SearchQuery
                    {
                        Column = "Id",
                        Not = false,
                        Operator = SearchOperator.Equals,
                        Value = System.Text.Json.JsonSerializer.Deserialize<object>(accountA.Id.ToString()),
                    }
                }
            };

            var result = (await AccountController.Search(query)).OkValue<ViewSearchResponse<ViewAccount>>();
            Assert.Equal(1, result.TotalItems);
            Assert.Single(result.Data);
            Assert.Equivalent(result.Data.First(), accountA);

            query.Query.Query.Not = true;
            result = (await AccountController.Search(query)).OkValue<ViewSearchResponse<ViewAccount>>();
            Assert.Equal(1, result.TotalItems);
            Assert.Single(result.Data);
            Assert.Equivalent(result.Data.First(), accountB);

            // Search for account without write permission
            query.Query.Query.Not = false;
            query.Query.Query.Value = System.Text.Json.JsonSerializer.Deserialize<object>(accountNoPermissions.Id.ToString());
            result = (await AccountController.Search(query)).OkValue<ViewSearchResponse<ViewAccount>>();
            Assert.Equal(0, result.TotalItems);
            Assert.Empty(result.Data);

            // Search for multiple accounts
            query.Query.Query.Operator = SearchOperator.In;
            query.Query.Query.Value = System.Text.Json.JsonSerializer.Deserialize<object>($"[{accountA.Id}, {accountB.Id}, {accountNoPermissions.Id}]");
            result = (await AccountController.Search(query)).OkValue<ViewSearchResponse<ViewAccount>>();
            Assert.Equal(2, result.TotalItems);
            Assert.Equal(2, result.Data.Count);
            Assert.Equivalent(new object[] { accountA, accountB }, result.Data);

            query.Descending = true;
            result = (await AccountController.Search(query)).OkValue<ViewSearchResponse<ViewAccount>>();
            Assert.Equal(2, result.TotalItems);
            Assert.Equal(2, result.Data.Count);
            Assert.Equivalent(new object[] { accountB, accountA }, result.Data);

            // Search for multiple accounts
            query.Query.Query.Not = true;
            result = (await AccountController.Search(query)).OkValue<ViewSearchResponse<ViewAccount>>();
            Assert.Equal(0, result.TotalItems);
            Assert.Empty(result.Data);
        }

        [Fact]
        public async void GetTransactions()
        {
            var model = new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = (await AccountController.Create(model)).OkValue<ViewAccount>();

            // Create transactions
            var random = new Random();
            List<ViewTransaction> transactions = new List<ViewTransaction>();
            for (var i = 0; i < 15; i++)
            {
                var total = random.Next(-500, 500);
                var createdTransaction = (await TransactionController.Create(new ViewModifyTransaction
                {
                    DestinationId = testAccount.Id,
                    Total = total,
                    Description = "Test transaction",
                    DateTime = new DateTime(2020, 01, 01).AddDays(i),
                    Identifiers = new List<string>(),
                    Lines = new List<ViewTransactionLine> { new ViewTransactionLine(total, "", "") },
                    MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>()
                })).OkValue<ViewTransaction>();
                // Transaction lists does not include metadata
                createdTransaction.MetaData = null;
                transactions.Add(createdTransaction);
            }

            var accountTransactions = (await AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
            {
                AccountId = testAccount.Id,
                From = 5,
                To = 10,
            })).OkValue<ViewTransactionList>();
            Assert.Equal(5, accountTransactions.Data.Count());
            Assert.Equal(15, accountTransactions.TotalItems);
            Assert.Equivalent(transactions.Skip(5).Take(5).ToList(), accountTransactions.Data);
            Assert.Equal(transactions.Take(5).Sum(t => t.Source?.Id == testAccount.Id ? -t.Total : t.Total), accountTransactions.Total);

            // Test descending order
            accountTransactions = (await AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
            {
                AccountId = testAccount.Id,
                From = 5,
                To = 10,
            })).OkValue<ViewTransactionList>();
            Assert.Equal(5, accountTransactions.Data.Count());
            Assert.Equal(15, accountTransactions.TotalItems);
            Assert.Equivalent(transactions.Skip(5).Take(5).Reverse().ToList(), accountTransactions.Data);
            Assert.Equal(transactions.Take(5).Sum(t => t.Source?.Id == testAccount.Id ? -t.Total : t.Total), accountTransactions.Total);

            // Test permissions
            UserAccount userAccount;
            foreach (var readPermission in new[] { UserAccountPermissions.Read, UserAccountPermissions.ModifyTransactions, UserAccountPermissions.All })
            {
                userAccount = Context.UserAccounts.Single(u => u.UserId == UserA.Id && u.AccountId == testAccount.Id);
                userAccount.Permissions = readPermission;
                Context.SaveChanges();
                transactions.ForEach(t =>
                {
                    if (t.Source != null) t.Source.Permissions = ViewAccount.PermissionsFromDbPermissions(readPermission);
                    if (t.Destination != null) t.Destination.Permissions = ViewAccount.PermissionsFromDbPermissions(readPermission);
                });
                accountTransactions = (await AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
                {
                    AccountId = testAccount.Id,
                    From = 5,
                    To = 10,
                })).OkValue<ViewTransactionList>();
                Assert.Equal(5, accountTransactions.Data.Count());
                Assert.Equal(15, accountTransactions.TotalItems);
                Assert.Equivalent(transactions.Skip(5).Take(5).ToList(), accountTransactions.Data);
                Assert.Equal(transactions.Take(5).Sum(t => t.Source?.Id == testAccount.Id ? -t.Total : t.Total), accountTransactions.Total);
            }

            userAccount = Context.UserAccounts.Single(u => u.UserId == UserA.Id && u.AccountId == testAccount.Id);
            Context.Remove(userAccount);
            Context.SaveChanges();

            Assert.IsType<NotFoundResult>(await AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
            {
                AccountId = testAccount.Id,
                From = 5,
                To = 10,
            }));
        }

        [Fact]
        public async void CountTransactions()
        {
            var model = new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = (await AccountController.Create(model)).OkValue<ViewAccount>();

            // Create transactions
            var random = new Random();
            List<ViewTransaction> transactions = new List<ViewTransaction>();
            for (var i = 0; i < 15; i++)
            {
                var createdTransaction = (await TransactionController.Create(new ViewModifyTransaction
                {
                    DestinationId = testAccount.Id,
                    Total = random.Next(-500, 500),
                    Description = "Test transaction",
                    DateTime = new DateTime(2020, 01, 01).AddDays(i),
                    Identifiers = new List<string>(),
                    Lines = new List<ViewTransactionLine>(),
                    MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>()
                })).OkValue<ViewTransaction>();
                transactions.Add(createdTransaction);
            }

            var result = (await AccountController.CountTransactions(testAccount.Id, null)).OkValue<int>();
            Assert.Equal(15, result);
        }

        [Theory]
        [InlineData(AccountMovementResolution.Daily)]
        // [InlineData(AccountMovementResolution.Weekly)] Disabled because the EF functions used are not supported for in-memory DB
        [InlineData(AccountMovementResolution.Monthly)]
        [InlineData(AccountMovementResolution.Yearly)]
        public async void GetMovement(AccountMovementResolution resolution)
        {
            var model = new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = (await AccountController.Create(model)).OkValue<ViewAccount>();

            // Create transactions
            var random = new Random();
            List<ViewTransaction> transactions = new List<ViewTransaction>();
            for (var i = 0; i < 365; i++)
            {
                var createdTransaction = (await TransactionController.Create(new ViewModifyTransaction
                {
                    DestinationId = testAccount.Id,
                    Total = random.Next(-500, 500),
                    Description = "Test transaction",
                    DateTime = new DateTime(2020, 01, 01).AddDays(i),
                    Identifiers = new List<string>(),
                    Lines = new List<ViewTransactionLine>(),
                    MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>()
                })).OkValue<ViewTransaction>();
                transactions.Add(createdTransaction);
            }

            var request = new ViewGetMovementRequest
            {
                From = new DateTime(2020, 06, 01),
                To = new DateTime(2020, 12, 31),
                Resolution = resolution
            };
            var result = (await AccountController.GetMovement(testAccount.Id, request)).OkValue<ViewGetMovementResponse>();
            Assert.Equal(result.InitialBalance, transactions.Where(t => t.DateTime < request.From).Sum(t => t.Destination?.Id == testAccount.Id ? t.Total : -t.Total));
                
            foreach (var item in result.Items)
            {
                List<ViewTransaction> relevantTransactions = transactions.Where(t => t.DateTime >= request.From && t.DateTime <= request.To).ToList();
                switch (resolution)
                {
                    case AccountMovementResolution.Daily:
                        relevantTransactions = relevantTransactions.Where(t => t.DateTime.ToString("dd-MM-yyyy") == item.DateTime.ToString("dd-MM-yyyy")).ToList();
                        break;
                    case AccountMovementResolution.Weekly:
                        relevantTransactions = relevantTransactions.Where(t => Math.Floor(t.DateTime.Subtract(request.From.Value).TotalDays / 7) == item.DateTime.Subtract(request.From.Value).TotalDays / 7).ToList();
                        break;
                    case AccountMovementResolution.Monthly:
                        relevantTransactions = relevantTransactions.Where(t => t.DateTime.ToString("MM-yyyy") == item.DateTime.ToString("MM-yyyy")).ToList();
                        break;
                    case AccountMovementResolution.Yearly:
                        relevantTransactions = relevantTransactions.Where(t => t.DateTime.ToString("yyyy") == item.DateTime.ToString("yyyy")).ToList();
                        break;
                    default:
                        throw new Exception("Unknown resolution");
                }
                Assert.Equal(item.Expenses, relevantTransactions.Where(t => t.Source?.Id == testAccount.Id).Sum(t => t.Total));
                Assert.Equal(item.Revenue, relevantTransactions.Where(t => t.Destination?.Id == testAccount.Id).Sum(t => t.Total));
            }

            var userAccount = Context.UserAccounts.Where(a => a.UserId == UserA.Id && a.AccountId == testAccount.Id).Single();
            Context.UserAccounts.Remove(userAccount);
            Context.SaveChanges();

            Assert.IsType<ForbidResult>(await AccountController.GetMovement(testAccount.Id, request));
        }

        [Fact]
        public async void GetMovementAll()
        {
            var accountModel = new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            var accountA = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();
            var transactionModel = new ViewModifyTransaction
            {
                DestinationId = accountA.Id,
                Total = 100,
                Description = "Test transaction",
                DateTime = new DateTime(2020, 01, 01),
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine>(),
                MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>()
            };
            await TransactionController.Create(transactionModel);

            accountModel.IncludeInNetWorth = false;
            var accountB = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();

            transactionModel.DestinationId = accountB.Id;
            transactionModel.Total = 200;
            await TransactionController.Create(transactionModel);

            transactionModel.DestinationId = accountB.Id;
            transactionModel.SourceId = accountA.Id;
            transactionModel.Total = 300;
            await TransactionController.Create(transactionModel);

            // Create an account with another user as well
            var userB = await UserService.CreateUser("test2", "test");
            UserService.MockUser = userB;
            accountModel.IncludeInNetWorth = true;
            var accountC = (await AccountController.Create(accountModel)).OkValue<ViewAccount>();
            transactionModel.SourceId = null;
            transactionModel.DestinationId = accountC.Id;
            transactionModel.Total = 400;
            await TransactionController.Create(transactionModel);

            // Get all movements for user 2
            var result = (await AccountController.GetMovementAll(new ViewGetMovementRequest
            {
                Resolution = AccountMovementResolution.Yearly
            })).OkValue<ViewGetMovementAllResponse>();
            Assert.Single(result.Items);
            Assert.Equal(400, result.Items.Single(x => x.Key == accountC.Id).Value.Items.First().Revenue);

            UserService.MockUser = await UserService.GetById(UserA.Id);
            result = (await AccountController.GetMovementAll(new ViewGetMovementRequest
            {
                Resolution = AccountMovementResolution.Yearly
            })).OkValue<ViewGetMovementAllResponse>(); ;
            Assert.Single(result.Items);
            Assert.Equal(100, result.Items.Single(x => x.Key == accountA.Id).Value.Items.First().Revenue);
            Assert.Equal(300, result.Items.Single(x => x.Key == accountA.Id).Value.Items.First().Expenses);

            accountB.IncludeInNetWorth = true;
            await AccountController.Update(accountB.Id, accountB);
            result = (await AccountController.GetMovementAll(new ViewGetMovementRequest
            {
                Resolution = AccountMovementResolution.Yearly
            })).OkValue<ViewGetMovementAllResponse>();
            Assert.Equal(2, result.Items.Count);
            Assert.Equal(100, result.Items.Single(x => x.Key == accountA.Id).Value.Items.First().Revenue);
            Assert.Equal(200, result.Items.Single(x => x.Key == accountB.Id).Value.Items.First().Revenue);
        }

        [Fact]
        public async void GetCategorySummary()
        {
            var account = (await AccountController.Create(new ViewCreateAccount
            {
                Identifiers = new List<string>(),
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            })).OkValue<ViewAccount>();

            var transactionModel = new ViewModifyTransaction
            {
                DestinationId = account.Id,
                Total = 100,
                Description = "Test transaction",
                DateTime = new DateTime(2020, 01, 01),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(100, "", "") },
                Identifiers = new List<string>(),
                MetaData = new List<assetgrid_backend.models.ViewModels.ViewSetMetaField>()
            };

            transactionModel.Lines.First().Category = "A";
            transactionModel.Total = 100;
            transactionModel.Lines.First().Amount = 100;
            var catA1 = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            transactionModel.Total = -150;
            transactionModel.Lines.First().Amount = -150;
            var catA2 = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            transactionModel.Lines.First().Category = "B";
            transactionModel.Total = 200;
            transactionModel.Lines.First().Amount = 200;
            var catB1 = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            transactionModel.Total = -250;
            transactionModel.Lines.First().Amount = -250;
            var catB2 = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            var result = (await AccountController.CategorySummary(account.Id, null)).OkValue<List<ViewCategorySummary>>();
            Assert.Equal(100, result.Single(x => x.Category == catA1.Lines.First().Category).Revenue);
            Assert.Equal(150, result.Single(x => x.Category == catA1.Lines.First().Category).Expenses);
            Assert.Equal(200, result.Single(x => x.Category == catB1.Lines.First().Category).Revenue);
            Assert.Equal(250, result.Single(x => x.Category == catB1.Lines.First().Category).Expenses);

            Context.UserAccounts.Remove(Context.UserAccounts.Single(account => account.UserId == UserA.Id && account.AccountId == account.Id));
            Context.SaveChanges();
            Assert.IsType<NotFoundResult>(await AccountController.CategorySummary(account.Id, null));
        }
    }
}