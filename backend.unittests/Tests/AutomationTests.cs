using assetgrid_backend.Controllers;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Models;
using assetgrid_backend.Services;
using assetgrid_backend;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;
using assetgrid_backend.Controllers.Automation;
using assetgrid_backend.models.Automation;
using assetgrid_backend.models.Search;
using assetgrid_backend.models.ViewModels.Automation;

namespace backend.unittests.Tests
{
    public class AutomationTests
    {
        public AssetgridDbContext Context { get; set; }
        public AccountController AccountController { get; set; }
        public TransactionController TransactionController { get; set; }
        public UserController UserController { get; set; }
        public TransactionAutomationController AutomationController { get; set; }
        public User UserA { get; set; }
        public User UserB { get; set; }
        public UserService UserService { get; set; }
        public AccountService AccountService { get; set; }

        public ViewAccount AccountA;
        public ViewAccount AccountB;
        public ViewAccount AccountRead;
        public ViewAccount AccountNoAccess;

        public AutomationTests()
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
            UserController.CreateInitial(new AuthenticateModel { Email = "userA", Password = "test" }).Wait();
            var userAResonse = UserController.Authenticate(new AuthenticateModel { Email = "userA", Password = "test" }).Result.OkValue<UserAuthenticatedResponse>();
            UserA = UserService.GetById(userAResonse.Id).Result;
            UserService.MockUser = UserA;
            UserB = UserService.CreateUser("userB", "test").Result;

            // Setup account controller
            AccountController = new AccountController(Context, UserService, AccountService, Options.Create<ApiBehaviorOptions>(null!));
            TransactionController = new TransactionController(Context, UserService, Options.Create<ApiBehaviorOptions>(null!));
            AutomationController = new TransactionAutomationController(Context, UserService, Options.Create<ApiBehaviorOptions>(null!));

            var objectValidator = new Mock<IObjectModelValidator>();
            objectValidator.Setup(o => o.Validate(It.IsAny<ActionContext>(),
                                            It.IsAny<ValidationStateDictionary>(),
                                            It.IsAny<string>(),
                                            It.IsAny<Object>()));
            TransactionController.ObjectValidator = objectValidator.Object;

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

            UserService.MockUser = UserB;
            accountModel.Name = "Read";
            AccountRead = AccountController.Create(accountModel).Result.OkValue<ViewAccount>();
            Context.UserAccounts.Add(new UserAccount {
                AccountId = AccountRead.Id,
                UserId = UserA.Id,
                Favorite = false,
                IncludeInNetWorth = false,
                Permissions = UserAccountPermissions.Read });
            accountModel.Name = "NoAccess";
            AccountNoAccess = AccountController.Create(accountModel).Result.OkValue<ViewAccount>();
            UserService.MockUser = UserA;
        }

        [Fact]
        public async void RunSingleSetDescription()
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            UserService.MockUser = UserB;
            transactionModel.SourceId = AccountRead.Id;
            transactionModel.DestinationId = null;
            var transactionRead = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            transactionModel.SourceId = AccountNoAccess.Id;
            var transactionNoAccess = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            UserService.MockUser = UserA;
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetDescription
                    {
                        Value = "Modified"
                    }
                }
            });

            // Transaction AB was modified
            transactionAB.Description = "Modified";
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());

            // Transaction read was not
            UserService.MockUser = UserB;
            Assert.Equivalent(transactionRead, (await TransactionController.Get(transactionRead.Id)).OkValue<ViewTransaction>());

            // Transaction no access was not
            Assert.Equivalent(transactionNoAccess, (await TransactionController.Get(transactionNoAccess.Id)).OkValue<ViewTransaction>());
        }

        [Fact]
        public async void RunSingleSetAmount()
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            UserService.MockUser = UserB;
            transactionModel.SourceId = AccountRead.Id;
            transactionModel.DestinationId = null;
            var transactionRead = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            transactionModel.SourceId = AccountNoAccess.Id;
            var transactionNoAccess = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            UserService.MockUser = UserA;
            transactionModel.Lines = new List<ViewTransactionLine>
            {
                new ViewTransactionLine(250, "", "My category"),
                new ViewTransactionLine(250, "", "My category")
            };
            transactionModel.IsSplit = true;
            transactionModel.SourceId = AccountA.Id;
            var transactionSplit = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            UserService.MockUser = UserA;
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetAmount
                    {
                        Value = 2000
                    }
                }
            });

            // Transaction AB was modified
            transactionAB.Total = 2000;
            transactionAB.Lines.Single().Amount = 2000;
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());

            // Split transaction was not
            Assert.Equivalent(transactionSplit, (await TransactionController.Get(transactionSplit.Id)).OkValue<ViewTransaction>());

            // Transaction read was not
            UserService.MockUser = UserB;
            Assert.Equivalent(transactionRead, (await TransactionController.Get(transactionRead.Id)).OkValue<ViewTransaction>());

            // Transaction no access was not
            Assert.Equivalent(transactionNoAccess, (await TransactionController.Get(transactionNoAccess.Id)).OkValue<ViewTransaction>());
        }

        [Fact]
        public async void RunSingleSetAmountNegative()
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetAmount
                    {
                        Value = -2000
                    }
                }
            });

            // Transaction AB was modified
            transactionAB.Total = 2000;
            transactionAB.Source = AccountB;
            transactionAB.Destination = AccountA;
            transactionAB.Lines = new List<ViewTransactionLine> { new ViewTransactionLine(2000, "", "My category") };
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());
        }

        [Fact]
        public async void RunSingleSetLinesSplit()
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetLines
                    {
                        Value = new List<ViewTransactionLine>
                        {
                            new ViewTransactionLine(100, "", ""),
                            new ViewTransactionLine(100, "", "")
                        }
                    }
                }
            });

            // Transaction AB was modified
            transactionAB.Total = 200;
            transactionAB.IsSplit = true;
            transactionAB.Lines = new List<ViewTransactionLine>
            {
                new ViewTransactionLine(100, "", ""),
                new ViewTransactionLine(100, "", "")
            };
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());
        }

        [Fact]
        public async void RunSingleSetLinesUnsplit()
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 1000,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(500, "", "My category"),
                    new ViewTransactionLine(500, "", "My category")}
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetLines
                    {
                        Value = new List<ViewTransactionLine> { }
                    }
                }
            });

            // Transaction AB was modified
            transactionAB.Total = 1000;
            transactionAB.IsSplit = false;
            transactionAB.Lines = new List<ViewTransactionLine>
            {
                new ViewTransactionLine(1000, "", "My category"),
            };
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());
        }

        [Fact]
        public async void RunSingleSetLinesNegativeTotal()
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetLines
                    {
                        Value = new List<ViewTransactionLine>
                        {
                            new ViewTransactionLine(100, "", ""),
                            new ViewTransactionLine(-300, "", "")
                        }
                    }
                }
            });

            // Transaction AB was modified
            transactionAB.Total = 200;
            transactionAB.IsSplit = true;
            transactionAB.Lines = new List<ViewTransactionLine>
            {
                new ViewTransactionLine(-100, "", ""),
                new ViewTransactionLine(300, "", "")
            };
            transactionAB.Source = transactionAB.Destination;
            transactionAB.Destination = AccountA;
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());
        }

        [Theory]
        [InlineData("source", true)]
        [InlineData("destination", true)]
        [InlineData("source", false)]
        [InlineData("destination", false)]
        public async void RunSingleSetAccount(string account, bool nullValue)
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var newAccount = nullValue ? null : (await AccountController.Create(new ViewCreateAccount
            {
                Description = "New account",
                Favorite = false,
                Identifiers = new List<string>(),
                IncludeInNetWorth = false,
                Name = "New account"
            })).OkValue<ViewAccount>();

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            // Also create transaction where the other account is the new account. These should not be modified
            transactionModel.SourceId = newAccount?.Id;
            var transactionANew = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            transactionModel.SourceId = AccountA.Id;
            transactionModel.DestinationId = newAccount?.Id;
            var transactionNewB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();


            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetAccount
                    {
                        Account = account,
                        Value = newAccount?.Id
                    }
                }
            });

            // Transaction AB was modified
            if (account == "source")
            {
                transactionAB.Source = newAccount;
            }
            else
            {
                transactionAB.Destination = newAccount;
            }
            Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());
            Assert.Equivalent(transactionANew, (await TransactionController.Get(transactionANew.Id)).OkValue<ViewTransaction>());
            Assert.Equivalent(transactionNewB, (await TransactionController.Get(transactionNewB.Id)).OkValue<ViewTransaction>());
        }

        [Theory]
        [InlineData("source", ViewAccount.AccountPermissions.All)]
        [InlineData("destination", ViewAccount.AccountPermissions.All)]
        [InlineData("source", ViewAccount.AccountPermissions.ModifyTransactions)]
        [InlineData("destination", ViewAccount.AccountPermissions.ModifyTransactions)]
        [InlineData("source", ViewAccount.AccountPermissions.Read)]
        [InlineData("destination", ViewAccount.AccountPermissions.Read)]
        [InlineData("source", ViewAccount.AccountPermissions.None)]
        [InlineData("destination", ViewAccount.AccountPermissions.None)]
        public async void RunSingleSetAccountNoPermission(string account, ViewAccount.AccountPermissions permissions)
        {
            var transactionModel = new ViewModifyTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Identifiers = new List<string>(),
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") }
            };

            var newAccount = (await AccountController.Create(new ViewCreateAccount
            {
                Description = "New account",
                Favorite = false,
                Identifiers = new List<string>(),
                IncludeInNetWorth = false,
                Name = "New account"
            })).OkValue<ViewAccount>();

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();

            // Change the permissions to the new account
            var userAccount = Context.UserAccounts.Single(account => account.AccountId == newAccount.Id && account.UserId == UserA.Id);
            switch (permissions)
            {
                case ViewAccount.AccountPermissions.None:
                    Context.UserAccounts.Remove(userAccount);
                    break;
                default:
                    userAccount.Permissions = (UserAccountPermissions)(permissions - 1);
                    newAccount.Permissions = permissions;
                    break;
            }
            await Context.SaveChangesAsync();

            var automation = new ViewTransactionAutomation
            {
                Query = new SearchGroup
                {
                    Type = SearchGroupType.And,
                    Children = new List<SearchGroup>()
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetAccount
                    {
                        Account = account,
                        Value = newAccount?.Id
                    }
                }
            };
            switch (permissions)
            {
                case ViewAccount.AccountPermissions.None:
                case ViewAccount.AccountPermissions.Read:
                    Assert.Throws<AggregateException>(() => AutomationController.RunSingle(automation).Result);
                    break;
                default:
                    var result = await AutomationController.RunSingle(automation);
                    if (account == "source")
                    {
                        transactionAB.Source = newAccount;
                    }
                    else
                    {
                        transactionAB.Destination = newAccount;
                    }
                    Assert.IsType<OkResult>(result);
                    Assert.Equivalent(transactionAB, (await TransactionController.Get(transactionAB.Id)).OkValue<ViewTransaction>());
                    break;
            }
        }
    }
}
