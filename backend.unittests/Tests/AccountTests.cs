using assetgrid_backend;
using assetgrid_backend.Controllers;
using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Services;
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

namespace backend.unittests.Tests
{
    public class AccountTests : IDisposable
    {
        public AssetgridDbContext Context { get; set; }
        public AccountController AccountController { get; set; }
        public UserAuthenticatedResponse User { get; set; }
        public TransactionController TransactionController { get; set; }
        public UserService UserService { get; set; }
        public AccountTests()
        {
            // Create DB context and connect
            var connection = new MySqlConnector.MySqlConnection("DataSource=:memory:");
            var options = new DbContextOptionsBuilder<AssetgridDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            Context = new AssetgridDbContext(options.Options);

            // Create user and log in
            UserService = new UserService(JwtSecret.Get(), Context);
            var userController = new UserController(Context, UserService);
            userController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            User = userController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" })!;
            UserService.MockUser = UserService.GetById(User.Id);

            // Setup account controller
            AccountController = new AccountController(Context, UserService);
            TransactionController = new TransactionController(Context, UserService);
        }

        public void Dispose()
        {
            Context.Dispose();
        }

        [Fact]
        public void CreateAccountUpdateAndDelete()
        {
            var model = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var createResult = AccountController.Create(model);
            Assert.NotNull(createResult);
            Assert.Equal(createResult.AccountNumber, model.AccountNumber);
            Assert.Equal(createResult.Description, model.Description);
            Assert.Equal(createResult.Favorite, model.Favorite);
            Assert.Equal(createResult.IncludeInNetWorth, model.IncludeInNetWorth);
            Assert.Equal(createResult.Name, model.Name);
            Assert.Equal(ViewAccount.AccountPermissions.All, createResult.Permissions);

            // Verify that the user has the correct permission
            Assert.NotNull(Context.UserAccounts
                .SingleOrDefault(account => account.UserId == User.Id &&
                    account.AccountId == createResult.Id &&
                    account.Permissions == UserAccountPermissions.All &&
                    account.Favorite == model.Favorite &&
                    account.IncludeInNetWorth == model.IncludeInNetWorth));

            // Get account
            var getResult = AccountController.Get(createResult.Id);
            Assert.NotNull(getResult);
            Assert.Equal(JsonConvert.SerializeObject(createResult), JsonConvert.SerializeObject(getResult));

            // Update account properties
            getResult.AccountNumber = "New account number";
            getResult.Description = "New description";
            getResult.Name = "Another name";

            var updateResult = AccountController.Update(getResult.Id, getResult)!;
            Assert.NotNull(updateResult);
            Assert.Equivalent(getResult, updateResult);

            // Update UserAccount properties
            updateResult.Favorite = !updateResult.Favorite;
            updateResult.IncludeInNetWorth = !updateResult.IncludeInNetWorth;

            var updateResult2 = AccountController.Update(updateResult.Id, updateResult)!;
            Assert.NotNull(updateResult2);
            Assert.Equivalent(updateResult, updateResult2);

            // Delete the account
            AccountController.Delete(updateResult2.Id);
        }

        [Theory]
        [InlineData(null)]
        [InlineData(UserAccountPermissions.Read)]
        [InlineData(UserAccountPermissions.ModifyTransactions)]
        [InlineData(UserAccountPermissions.All)]
        public void GetUpdateDeleteSharedAccount(UserAccountPermissions? permissions)
        {
            var model = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = AccountController.Create(model);
            var userAccount = Context.UserAccounts.SingleOrDefault(account => account.UserId == User.Id && account.AccountId == testAccount.Id)!;
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
                Assert.Null(AccountController.Get(testAccount.Id));
            }
            else
            {
                testAccount.Permissions = ViewAccount.PermissionsFromDbPermissions(permissions.Value);
                Assert.Equivalent(testAccount, AccountController.Get(testAccount.Id));
            }

            // Update the account
            testAccount.Name = "New name";
            if (permissions == UserAccountPermissions.All)
            {

                var updateResult = AccountController.Update(testAccount.Id, testAccount)!;
                Assert.Equivalent(updateResult, testAccount);
                AccountController.Delete(updateResult.Id);
            }
            else
            {
                Assert.Throws<Exception>(() => AccountController.Update(testAccount.Id, testAccount));
                Assert.Throws<Exception>(() => AccountController.Delete(testAccount.Id));
            }
        }

        [Fact]
        public void SearchById()
        {
            var model = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "A"
            };

            // Create account
            var accountA = AccountController.Create(model);
            model.Name = "B";
            var accountB = AccountController.Create(model);
            model.Name = "No permission";
            var accountNoPermissions = AccountController.Create(model);
            var userAccount = Context.UserAccounts.SingleOrDefault(account => account.UserId == User.Id && account.AccountId == accountNoPermissions.Id)!;
            Context.Remove(userAccount);
            Context.SaveChanges();

            var query = new ViewSearch
            {
                From = 0,
                To = 20,
                OrderByColumn = "Description",
                Descending = false,
                Query = new ViewSearchGroup
                {
                    Type = ViewSearchGroupType.Query,
                    Query = new ViewSearchQuery
                    {
                        Column = "Id",
                        Not = false,
                        Operator = ViewSearchOperator.Equals,
                        Value = System.Text.Json.JsonSerializer.Deserialize<object>(accountA.Id.ToString()),
                    }
                }
            };

            var result = AccountController.Search(query);
            Assert.Equal(1, result.TotalItems);
            Assert.Single(result.Data);
            Assert.Equivalent(result.Data.First(), accountA);

            query.Query.Query.Not = true;
            result = AccountController.Search(query);
            Assert.Equal(1, result.TotalItems);
            Assert.Single(result.Data);
            Assert.Equivalent(result.Data.First(), accountB);

            // Search for account without write permission
            query.Query.Query.Not = false;
            query.Query.Query.Value = System.Text.Json.JsonSerializer.Deserialize<object>(accountNoPermissions.Id.ToString());
            result = AccountController.Search(query);
            Assert.Equal(0, result.TotalItems);
            Assert.Empty(result.Data);

            // Search for multiple accounts
            query.Query.Query.Operator = ViewSearchOperator.In;
            query.Query.Query.Value = System.Text.Json.JsonSerializer.Deserialize<object>($"[{accountA.Id}, {accountB.Id}, {accountNoPermissions.Id}]");
            result = AccountController.Search(query);
            Assert.Equal(2, result.TotalItems);
            Assert.Equal(2, result.Data.Count);
            Assert.Equivalent(new object[] { accountA, accountB }, result.Data);

            query.Descending = true;
            result = AccountController.Search(query);
            Assert.Equal(2, result.TotalItems);
            Assert.Equal(2, result.Data.Count);
            Assert.Equivalent(new object[] { accountB, accountA }, result.Data);

            // Search for multiple accounts
            query.Query.Query.Not = true;
            result = AccountController.Search(query);
            Assert.Equal(0, result.TotalItems);
            Assert.Empty(result.Data);
        }

        [Fact]
        public void GetTransactions()
        {
            var model = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = AccountController.Create(model);

            // Create transactions
            var random = new Random();
            List<ViewTransaction> transactions = new List<ViewTransaction>();
            for (var i = 0; i < 15; i++)
            {
                var createdTransaction = TransactionController.Create(new ViewCreateTransaction
                {
                    DestinationId = testAccount.Id,
                    Total = random.Next(-500, 500),
                    Description = "Test transaction",
                    DateTime = new DateTime(2020, 01, 01).AddDays(i),
                    Category = "",
                    Lines = new List<ViewTransactionLine>()
                });
                transactions.Add(createdTransaction);
            }

            var accountTransactions = AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
            {
                AccountId = testAccount.Id,
                From = 5,
                To = 10,
            });
            Assert.Equal(5, accountTransactions.Data.Count());
            Assert.Equal(15, accountTransactions.TotalItems);
            Assert.Equivalent(transactions.Skip(5).Take(5).ToList(), accountTransactions.Data);
            Assert.Equal(transactions.Take(5).Sum(t => t.Source?.Id == testAccount.Id ? -t.Total : t.Total), accountTransactions.Total);

            // Test descending order
            accountTransactions = AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
            {
                AccountId = testAccount.Id,
                From = 5,
                To = 10,
            });
            Assert.Equal(5, accountTransactions.Data.Count());
            Assert.Equal(15, accountTransactions.TotalItems);
            Assert.Equivalent(transactions.Skip(5).Take(5).Reverse().ToList(), accountTransactions.Data);
            Assert.Equal(transactions.Take(5).Sum(t => t.Source?.Id == testAccount.Id ? -t.Total : t.Total), accountTransactions.Total);

            // Test permissions
            UserAccount userAccount;
            foreach (var readPermission in new[] { UserAccountPermissions.Read, UserAccountPermissions.ModifyTransactions, UserAccountPermissions.All })
            {
                userAccount = Context.UserAccounts.Single(u => u.UserId == User.Id && u.AccountId == testAccount.Id);
                userAccount.Permissions = readPermission;
                Context.SaveChanges();
                transactions.ForEach(t =>
                {
                    if (t.Source != null) t.Source.Permissions = ViewAccount.PermissionsFromDbPermissions(readPermission);
                    if (t.Destination != null) t.Destination.Permissions = ViewAccount.PermissionsFromDbPermissions(readPermission);
                });
                accountTransactions = AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
                {
                    AccountId = testAccount.Id,
                    From = 5,
                    To = 10,
                });
                Assert.Equal(5, accountTransactions.Data.Count());
                Assert.Equal(15, accountTransactions.TotalItems);
                Assert.Equivalent(transactions.Skip(5).Take(5).ToList(), accountTransactions.Data);
                Assert.Equal(transactions.Take(5).Sum(t => t.Source?.Id == testAccount.Id ? -t.Total : t.Total), accountTransactions.Total);
            }

            userAccount = Context.UserAccounts.Single(u => u.UserId == User.Id && u.AccountId == testAccount.Id);
            Context.Remove(userAccount);
            Context.SaveChanges();

            Assert.Throws<Exception>(() => AccountController.Transactions(testAccount.Id, new ViewTransactionListRequest
            {
                AccountId = testAccount.Id,
                From = 5,
                To = 10,
            }));
        }

        [Fact]
        public void CountTransactions()
        {
            var model = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = AccountController.Create(model);

            // Create transactions
            var random = new Random();
            List<ViewTransaction> transactions = new List<ViewTransaction>();
            for (var i = 0; i < 15; i++)
            {
                var createdTransaction = TransactionController.Create(new ViewCreateTransaction
                {
                    DestinationId = testAccount.Id,
                    Total = random.Next(-500, 500),
                    Description = "Test transaction",
                    DateTime = new DateTime(2020, 01, 01).AddDays(i),
                    Category = "",
                    Lines = new List<ViewTransactionLine>()
                });
                transactions.Add(createdTransaction);
            }

            var result = AccountController.CountTransactions(testAccount.Id, null);
            Assert.Equal(15, result);
        }

        [Theory]
        [InlineData(AccountMovementResolution.Daily)]
        // [InlineData(AccountMovementResolution.Weekly)] Disabled because the EF functions used are not supported for in-memory DB
        [InlineData(AccountMovementResolution.Monthly)]
        [InlineData(AccountMovementResolution.Yearly)]
        public void GetMovement(AccountMovementResolution resolution)
        {
            var model = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            // Create account
            var testAccount = AccountController.Create(model);

            // Create transactions
            var random = new Random();
            List<ViewTransaction> transactions = new List<ViewTransaction>();
            for (var i = 0; i < 365; i++)
            {
                var createdTransaction = TransactionController.Create(new ViewCreateTransaction
                {
                    DestinationId = testAccount.Id,
                    Total = random.Next(-500, 500),
                    Description = "Test transaction",
                    DateTime = new DateTime(2020, 01, 01).AddDays(i),
                    Category = "",
                    Lines = new List<ViewTransactionLine>()
                });
                transactions.Add(createdTransaction);
            }

            var request = new ViewGetMovementRequest
            {
                From = new DateTime(2020, 06, 01),
                To = new DateTime(2020, 12, 31),
                Resolution = resolution
            };
            var result = AccountController.GetMovement(testAccount.Id, request);
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

            var userAccount = Context.UserAccounts.Where(a => a.UserId == User.Id && a.AccountId == testAccount.Id).Single();
            Context.UserAccounts.Remove(userAccount);
            Context.SaveChanges();

            Assert.Throws<Exception>(() => AccountController.GetMovement(testAccount.Id, request));
        }

        [Fact]
        public void GetMovementAll()
        {
            var accountModel = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };

            var accountA = AccountController.Create(accountModel);
            var transactionModel = new ViewCreateTransaction
            {
                DestinationId = accountA.Id,
                Total = 100,
                Description = "Test transaction",
                DateTime = new DateTime(2020, 01, 01),
                Category = "",
                Lines = new List<ViewTransactionLine>()
            };
            TransactionController.Create(transactionModel);

            accountModel.IncludeInNetWorth = false;
            var accountB = AccountController.Create(accountModel);

            transactionModel.DestinationId = accountB.Id;
            transactionModel.Total = 200;
            TransactionController.Create(transactionModel);

            transactionModel.DestinationId = accountB.Id;
            transactionModel.SourceId = accountA.Id;
            transactionModel.Total = 300;
            TransactionController.Create(transactionModel);

            // Create an account with another user as well
            var userB = UserService.CreateUser("test2", "test");
            UserService.MockUser = userB;
            accountModel.IncludeInNetWorth = true;
            var accountC = AccountController.Create(accountModel);
            transactionModel.SourceId = null;
            transactionModel.DestinationId = accountC.Id;
            transactionModel.Total = 400;
            TransactionController.Create(transactionModel);

            // Get all movements for user 2
            var result = AccountController.GetMovementAll(new ViewGetMovementRequest
            {
                Resolution = AccountMovementResolution.Yearly
            });
            Assert.Single(result.Items);
            Assert.Equal(400, result.Items.Single(x => x.Key == accountC.Id).Value.Items.First().Revenue);

            UserService.MockUser = UserService.GetById(User.Id);
            result = AccountController.GetMovementAll(new ViewGetMovementRequest
            {
                Resolution = AccountMovementResolution.Yearly
            });
            Assert.Single(result.Items);
            Assert.Equal(100, result.Items.Single(x => x.Key == accountA.Id).Value.Items.First().Revenue);
            Assert.Equal(300, result.Items.Single(x => x.Key == accountA.Id).Value.Items.First().Expenses);

            accountB.IncludeInNetWorth = true;
            AccountController.Update(accountB.Id, accountB);
            result = AccountController.GetMovementAll(new ViewGetMovementRequest
            {
                Resolution = AccountMovementResolution.Yearly
            });
            Assert.Equal(2, result.Items.Count);
            Assert.Equal(100, result.Items.Single(x => x.Key == accountA.Id).Value.Items.First().Revenue);
            Assert.Equal(200, result.Items.Single(x => x.Key == accountB.Id).Value.Items.First().Revenue);
        }

        [Fact]
        public void GetCategorySummary()
        {
            var account = AccountController.Create(new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            });

            var transactionModel = new ViewCreateTransaction
            {
                DestinationId = account.Id,
                Total = 100,
                Description = "Test transaction",
                DateTime = new DateTime(2020, 01, 01),
                Category = "",
                Lines = new List<ViewTransactionLine>()
            };

            transactionModel.Category = "A";
            transactionModel.Total = 100;
            var catA1 = TransactionController.Create(transactionModel);
            transactionModel.Total = -150;
            var catA2 = TransactionController.Create(transactionModel);

            transactionModel.Category = "B";
            transactionModel.Total = 200;
            var catB1 = TransactionController.Create(transactionModel);
            transactionModel.Total = -250;
            var catB2 = TransactionController.Create(transactionModel);

            var result = AccountController.CategorySummary(account.Id, null);
            Assert.Equal(100, result.Single(x => x.Category == catA1.Category).Revenue);
            Assert.Equal(150, result.Single(x => x.Category == catA1.Category).Expenses);
            Assert.Equal(200, result.Single(x => x.Category == catB1.Category).Revenue);
            Assert.Equal(250, result.Single(x => x.Category == catB1.Category).Expenses);

            Context.UserAccounts.Remove(Context.UserAccounts.Single(account => account.UserId == User.Id && account.AccountId == account.Id));
            Context.SaveChanges();
            Assert.Throws<Exception>(() => AccountController.CategorySummary(account.Id, null));
        }
    }
}