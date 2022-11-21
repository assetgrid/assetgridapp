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
using System.Security.Principal;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using assetgrid_backend.models.ViewModels;

namespace backend.unittests.Tests
{
    public class AutomationTests : TestBase
    {
        public ViewAccount AccountA;
        public ViewAccount AccountB;
        public ViewAccount AccountRead;
        public ViewAccount AccountNoAccess;

        public AutomationTests() : base()
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

            UserService.MockUser = UserB;
            accountModel.Name = "Read";
            AccountRead = AccountController.Create(accountModel).Result.OkValue<ViewAccount>();
            Context.UserAccounts.Add(new UserAccount {
                AccountId = AccountRead.Id,
                Account = Context.Accounts.Single(x => x.Id == AccountRead.Id),
                UserId = UserA.Id,
                User = UserA,
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
                MetaData = new List<ViewSetMetaField>(),
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
                Name = "Test automation",
                Description = "Test automation",
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
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") },
                MetaData = new List<ViewSetMetaField>()
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
                Name = "Test automation",
                Description = "Test automation",
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
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") },
                MetaData = new List<ViewSetMetaField>()
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Name = "Test automation",
                Description = "Test automation",
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
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") },
                MetaData = new List<ViewSetMetaField>(),
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Name = "Test automation",
                Description = "Test automation",
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
                    new ViewTransactionLine(500, "", "My category")},
                MetaData = new List<ViewSetMetaField>(),
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Name = "Test automation",
                Description = "Test automation",
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
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") },
                MetaData = new List<ViewSetMetaField>()
            };

            var transactionAB = (await TransactionController.Create(transactionModel)).OkValue<ViewTransaction>();
            await AutomationController.RunSingle(new ViewTransactionAutomation
            {
                Name = "Test automation",
                Description = "Test automation",
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
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") },
                MetaData = new List<ViewSetMetaField>()
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
                Name = "Test automation",
                Description = "Test description",
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
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(500, "", "My category") },
                MetaData = new List<ViewSetMetaField>()
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
                Name = "Test name",
                Description = "Test description",
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

        [Fact]
        public async void CreateGetModifyDelete()
        {
            var automationModel = new ViewTransactionAutomation
            {
                Name = "Test name",
                Description = "Test description",
                Enabled = true,
                TriggerOnCreate = true,
                TriggerOnModify = true,
                Query = new SearchGroup
                {
                    Type = SearchGroupType.Query,
                    Query = new SearchQuery
                    {
                        Column = "Description",
                        Operator = SearchOperator.Equals,
                        Not = false,
                        Value = "run-automation"
                    }
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetCategory
                    {
                        Value = "modified"
                    }
                },
                Permissions = UserTransactionAutomation.AutomationPermissions.Modify
            };

            var createResult = await AutomationController.Create(automationModel);
            Assert.IsType<OkObjectResult>(createResult);
            var createdAutomation = createResult.OkValue<ViewTransactionAutomation>();
            automationModel.Id = createdAutomation.Id;
            Assert.Equivalent(automationModel, createdAutomation);

            Assert.Equivalent(createdAutomation, (await AutomationController.Get(automationModel.Id)).OkValue<ViewTransactionAutomation>());

            Assert.Single((await AutomationController.List()).OkValue<List<ViewTransactionAutomationSummary>>());

            UserService.MockUser = UserB;
            Assert.Empty((await AutomationController.List()).OkValue<List<ViewTransactionAutomationSummary>>());
            UserService.MockUser = UserA;

            automationModel.Description = "New description";
            automationModel.Name = "New name";
            automationModel.Enabled = false;
            automationModel.TriggerOnCreate = false;
            automationModel.TriggerOnModify = false;
            automationModel.Actions = new List<TransactionAutomationAction> { new ActionSetDescription { Value = "New description" } };

            var updateResult = await AutomationController.Modify(automationModel.Id, automationModel);
            Assert.IsType<OkObjectResult>(updateResult);
            var updatedAutomation = updateResult.OkValue<ViewTransactionAutomation>();
            Assert.Equivalent(automationModel, updatedAutomation);

            var deleteResult = await AutomationController.Delete(automationModel.Id);
            Assert.IsType<OkResult>(deleteResult);

            Assert.Empty(Context.UserTransactionAutomations.Where(x => x.UserId == UserA.Id && x.TransactionAutomationId == automationModel.Id));
            Assert.Empty(Context.TransactionAutomations.Where(x => x.Id == automationModel.Id));
        }

        [Fact]
        public async void AccessOtherUserAutomations()
        {
            var automationModel = (await AutomationController.Create(new ViewTransactionAutomation
            {
                Name = "Test name",
                Description = "Test description",
                Enabled = true,
                TriggerOnCreate = true,
                TriggerOnModify = true,
                Query = new SearchGroup
                {
                    Type = SearchGroupType.Query,
                    Query = new SearchQuery
                    {
                        Column = "Description",
                        Operator = SearchOperator.Equals,
                        Not = false,
                        Value = "run-automation"
                    }
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetCategory
                    {
                        Value = "modified"
                    }
                },
                Permissions = UserTransactionAutomation.AutomationPermissions.Modify
            })).OkValue<ViewTransactionAutomation>();

            // User A can get the transaction
            var getResult = await AutomationController.Get(automationModel.Id);
            Assert.IsType<OkObjectResult>(getResult);

            // User B cannot
            UserService.MockUser = UserB;
            Assert.IsType<NotFoundResult>(await AutomationController.Get(automationModel.Id));
            Assert.Empty((await AutomationController.List()).OkValue<List<ViewTransactionAutomationSummary>>());

            // User B cannot modify it either
            var modifiedAutomation = getResult.OkValue<ViewTransactionAutomation>();
            modifiedAutomation.Description = "Modified";
            Assert.IsType<NotFoundResult>(await AutomationController.Modify(modifiedAutomation.Id, modifiedAutomation));
            UserService.MockUser = UserA;
            Assert.Equivalent(automationModel, (await AutomationController.Get(automationModel.Id)).OkValue<ViewTransactionAutomation>());

            // Change user B's permissions to view
            var userAutomation = new UserTransactionAutomation
            {
                Enabled = true,
                Permissions = UserTransactionAutomation.AutomationPermissions.Read,
                TransactionAutomationId = modifiedAutomation.Id,
                TransactionAutomation = Context.TransactionAutomations.Single(x => x.Id == modifiedAutomation.Id),
                UserId = UserB.Id,
                User = UserB
            };
            Context.Add(userAutomation);
            await Context.SaveChangesAsync();

            // User B can get transaction
            UserService.MockUser = UserB;
            getResult = await AutomationController.Get(automationModel.Id);
            automationModel.Permissions = UserTransactionAutomation.AutomationPermissions.Read;
            Assert.IsType<OkObjectResult>(getResult);
            Assert.Equivalent(automationModel, getResult.OkValue<ViewTransactionAutomation>());

            var listResult = (await AutomationController.List()).OkValue<List<ViewTransactionAutomationSummary>>();
            Assert.Single(listResult);
            Assert.Equal(automationModel.Name, listResult.Single().Name);
            Assert.Equal(automationModel.Description, listResult.Single().Description);
            Assert.Equal(automationModel.TriggerOnCreate, listResult.Single().TriggerOnCreate);
            Assert.Equal(automationModel.TriggerOnModify, listResult.Single().TriggerOnModify);

            // Still cannot modify
            Assert.IsType<ForbidResult>(await AutomationController.Modify(modifiedAutomation.Id, modifiedAutomation));
            Assert.Equivalent(automationModel, (await AutomationController.Get(automationModel.Id)).OkValue<ViewTransactionAutomation>());

            // Change user B's permissions to write
            userAutomation.Permissions = UserTransactionAutomation.AutomationPermissions.Modify;
            automationModel.Permissions = UserTransactionAutomation.AutomationPermissions.Modify;

            // User B can get transaction
            getResult = await AutomationController.Get(automationModel.Id);
            Assert.IsType<OkObjectResult>(getResult);
            Assert.Equivalent(automationModel, getResult.OkValue<ViewTransactionAutomation>());

            listResult = (await AutomationController.List()).OkValue<List<ViewTransactionAutomationSummary>>();
            Assert.Single(listResult);
            Assert.Equal(automationModel.Name, listResult.Single().Name);
            Assert.Equal(automationModel.Description, listResult.Single().Description);
            Assert.Equal(automationModel.TriggerOnCreate, listResult.Single().TriggerOnCreate);
            Assert.Equal(automationModel.TriggerOnModify, listResult.Single().TriggerOnModify);

            // Can modify now
            var modifyResult = await AutomationController.Modify(modifiedAutomation.Id, modifiedAutomation);
            Assert.IsType<OkObjectResult>(modifyResult);
            var modifyObject = modifyResult.OkValue<ViewTransactionAutomation>();
            Assert.Equivalent(modifiedAutomation, modifyObject);
        }

        [Theory]
        [InlineData(true, true)]
        [InlineData(true, false)]
        [InlineData(false, true)]
        [InlineData(false, false)]
        public async void TriggerAutomationOnCreate(bool triggerOnCreate, bool multiple)
        {
            var create = (string description) =>
            {
                var model = new ViewModifyTransaction
                {
                    DateTime = DateTime.Now,
                    Description = description,
                    DestinationId = AccountB.Id,
                    SourceId = AccountA.Id,
                    Identifiers = new List<string>(),
                    IsSplit = false,
                    Lines = new List<ViewTransactionLine> { new ViewTransactionLine(200, "Transaction line", "") },
                    Total = 200,
                    MetaData = new List<ViewSetMetaField>()
                };

                if (multiple)
                {
                    // Multi creation does not support metadata, but it must be set to prevent Assert.Equivalent from failing
                    var result = TransactionController.CreateMany(new List<ViewModifyTransaction> { model }).Result.OkValue<ViewTransactionCreateManyResponse>().Succeeded.Single();
                    result.MetaData = new List<ViewMetaFieldValue>();
                    return result;
                }
                else
                {
                    return TransactionController.Create(model).Result.OkValue<ViewTransaction>();
                }
            };

            var automationModel = (await AutomationController.Create(new ViewTransactionAutomation
            {
                Name = "Test name",
                Description = "Test description",
                Enabled = true,
                TriggerOnCreate = triggerOnCreate,
                TriggerOnModify = false,
                Query = new SearchGroup
                {
                    Type = SearchGroupType.Query,
                    Query = new SearchQuery
                    {
                        Column = "Description",
                        Operator = SearchOperator.Equals,
                        Not = false,
                        Value = "run-automation"
                    }
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetCategory
                    {
                        Value = "modified"
                    }
                },
                Permissions = UserTransactionAutomation.AutomationPermissions.Modify
            })).OkValue<ViewTransactionAutomation>();
            Context.UserAccounts.Add(new UserAccount {
                AccountId = AccountA.Id,
                Account = Context.Accounts.Single(x => x.Id == AccountA.Id),
                UserId = UserB.Id,
                User = UserB,
                Permissions = UserAccountPermissions.All });
            Context.UserAccounts.Add(new UserAccount {
                AccountId = AccountB.Id,
                Account = Context.Accounts.Single(x => x.Id == AccountB.Id),
                UserId = UserB.Id,
                User = UserB,
                Permissions = UserAccountPermissions.All });
            await Context.SaveChangesAsync();

            // Create transaction with User A - should be modified
            var transaction = create("run-automation");
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
            Assert.Equal(triggerOnCreate ? "modified" : "", transaction.Lines.Single().Category);

            // Modify transaction - should not trigger automation
            transaction.Lines.First().Category = "";
            Assert.Equivalent(transaction, (await TransactionController.Update(transaction.Id, new ViewModifyTransaction
            {
                Total = transaction.Total,
                DateTime = transaction.DateTime,
                Description = transaction.Description,
                DestinationId = transaction.Destination?.Id,
                SourceId = transaction.Source?.Id,
                Identifiers = transaction.Identifiers,
                Lines = transaction.Lines,
                IsSplit = transaction.IsSplit,
                MetaData = new List<ViewSetMetaField>()
            })).OkValue<ViewTransaction>());
            // Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());

            // Create transaction with User A that doesn't match query - should not be modified
            transaction = create("don't-run-automation");
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
            Assert.Equal("", transaction.Lines.Single().Category);

            UserService.MockUser = UserB;
            // Create transaction with User A - should not be modified despite matching query
            transaction = create("run-automation");
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
            Assert.Equal("", transaction.Lines.Single().Category);

            // Change user B's permissions to view
            var userAutomation = new UserTransactionAutomation
            {
                Enabled = true,
                Permissions = UserTransactionAutomation.AutomationPermissions.Read,
                TransactionAutomationId = automationModel.Id,
                TransactionAutomation = Context.TransactionAutomations.Single(x => x.Id == automationModel.Id),
                UserId = UserB.Id,
                User = UserB
            };
            Context.Add(userAutomation);
            await Context.SaveChangesAsync();

            // Create transaction with User B - should now be modified as user B now sees the automation
            transaction = create("run-automation");
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
            Assert.Equal(triggerOnCreate ? "modified" : "", transaction.Lines.Single().Category);

            // Change permission to modify automation - should still run
            userAutomation.Permissions = UserTransactionAutomation.AutomationPermissions.Modify;
            await Context.SaveChangesAsync();
            transaction = create("run-automation");
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
            Assert.Equal(triggerOnCreate ? "modified" : "", transaction.Lines.Single().Category);

            // Disable the automation - now it won't run
            userAutomation.Enabled = false;
            await Context.SaveChangesAsync();
            transaction = create("run-automation");
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
            Assert.Equal("", transaction.Lines.Single().Category);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public async void TriggerAutomationOnModify(bool triggerOnModify)
        {
            var model = new ViewModifyTransaction
            {
                DateTime = DateTime.Now,
                Description = "run-automation",
                DestinationId = AccountB.Id,
                SourceId = AccountA.Id,
                Identifiers = new List<string>(),
                IsSplit = false,
                Lines = new List<ViewTransactionLine> { new ViewTransactionLine(200, "Transaction line", "") },
                Total = 200,
                MetaData = new List<ViewSetMetaField>()
            };

            var automationModel = (await AutomationController.Create(new ViewTransactionAutomation
            {
                Name = "Test name",
                Description = "Test description",
                Enabled = true,
                TriggerOnCreate = false,
                TriggerOnModify = triggerOnModify,
                Query = new SearchGroup
                {
                    Type = SearchGroupType.Query,
                    Query = new SearchQuery
                    {
                        Column = "Description",
                        Operator = SearchOperator.Equals,
                        Not = false,
                        Value = "run-automation"
                    }
                },
                Actions = new List<TransactionAutomationAction>
                {
                    new ActionSetCategory
                    {
                        Value = "modified"
                    }
                },
                Permissions = UserTransactionAutomation.AutomationPermissions.Modify
            })).OkValue<ViewTransactionAutomation>();
            Context.UserAccounts.Add(new UserAccount {
                AccountId = AccountA.Id,
                Account = Context.Accounts.Single(x => x.Id == AccountA.Id),
                UserId = UserB.Id,
                User = UserB,
                Permissions = UserAccountPermissions.All });
            Context.UserAccounts.Add(new UserAccount {
                AccountId = AccountB.Id,
                Account = Context.Accounts.Single(x => x.Id == AccountB.Id),
                UserId = UserB.Id,
                User = UserB,
                Permissions = UserAccountPermissions.All });
            await Context.SaveChangesAsync();

            // Create a test transaction. Should not trigger automation
            var transaction = (await TransactionController.Create(model)).OkValue<ViewTransaction>();
            Assert.Equal("", transaction.Lines.Single().Category);

            // Create another transaction that doesn't match the query. Still shouldn't trigger automation
            model.Description = "do-not-run-automation";
            var transactionDontRun = (await TransactionController.Create(model)).OkValue<ViewTransaction>();
            Assert.Equal("", transactionDontRun.Lines.Single().Category);

            // Modify first transaction by changing it's timestmap. Should trigger automation
            model.Description = transaction.Description;
            transaction.DateTime = DateTime.Now;
            model.DateTime = transactionDontRun.DateTime;
            Assert.IsType<OkObjectResult>(await TransactionController.Update(transaction.Id, model));
            Assert.Equal(triggerOnModify ? "modified" : "", (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>().Lines.Single().Category);

            // Modify second transaction by changing it's timestamp. Should not trigger automation
            model.Description = transactionDontRun.Description;
            transactionDontRun.DateTime = DateTime.Now;
            model.DateTime = transactionDontRun.DateTime;
            Assert.Equivalent(transactionDontRun, (await TransactionController.Update(transactionDontRun.Id, model)).OkValue<ViewTransaction>());
            Assert.Equivalent(transactionDontRun, (await TransactionController.Get(transactionDontRun.Id)).OkValue<ViewTransaction>());

            // Modify second transaction and set description to trigger value. Should trigger automation
            model.Description = transaction.Description;
            Assert.IsType<OkObjectResult>(await TransactionController.Update(transactionDontRun.Id, model));
            Assert.Equal(triggerOnModify ? "modified" : "", (await TransactionController.Get(transactionDontRun.Id)).OkValue<ViewTransaction>().Lines.Single().Category);

            // Modify so description no longer matches criterium. Shouldn't update
            model.Description = "do-not-run-automation";
            Assert.IsType<OkObjectResult>(await TransactionController.Update(transactionDontRun.Id, model));
            Assert.Equivalent(transactionDontRun, (await TransactionController.Get(transactionDontRun.Id)).OkValue<ViewTransaction>());

            // Switch to user B and create transaction - shouldn't be modified
            UserService.MockUser = UserB;
            transaction = (await TransactionController.Create(model)).OkValue<ViewTransaction>();
            Assert.Equal("", transaction.Lines.Single().Category);

            // Set description to trigger value - still shouldn't be modified
            transaction.Description = "run-automation";
            model.Description = "run-automation";
            Assert.Equivalent(transaction, (await TransactionController.Update(transaction.Id, model)).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());

            // Change user B's permissions to view
            var userAutomation = new UserTransactionAutomation
            {
                Enabled = true,
                Permissions = UserTransactionAutomation.AutomationPermissions.Read,
                TransactionAutomationId = automationModel.Id,
                TransactionAutomation = Context.TransactionAutomations.Single(x => x.Id == automationModel.Id),
                UserId = UserB.Id,
                User = UserB,
            };
            Context.Add(userAutomation);
            await Context.SaveChangesAsync();

            // Now the transaction runs
            Assert.IsType<OkObjectResult>(await TransactionController.Update(transaction.Id, model));
            Assert.Equal(triggerOnModify ? "modified" : "", (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>().Lines.Single().Category);

            // It also runs if the user has write permission
            userAutomation.Permissions = UserTransactionAutomation.AutomationPermissions.Modify;
            await Context.SaveChangesAsync();
            Assert.IsType<OkObjectResult>(await TransactionController.Update(transaction.Id, model));
            Assert.Equal(triggerOnModify ? "modified" : "", (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>().Lines.Single().Category);

            // It doesn't run when the automation is diabled
            userAutomation.Enabled = false;
            await Context.SaveChangesAsync();
            Assert.Equivalent(transaction, (await TransactionController.Update(transaction.Id, model)).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction, (await TransactionController.Get(transaction.Id)).OkValue<ViewTransaction>());
        }
    }
}
