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
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace backend.unittests.Tests
{
    public class TransactionTests
    {
        public AssetgridDbContext Context { get; set; }
        public AccountController AccountController { get; set; }
        public TransactionController TransactionController { get; set; }
        public UserController UserController { get; set; }
        public UserAuthenticatedResponse User { get; set; }
        public UserService UserService { get; set; }

        public ViewAccount AccountA;
        public ViewAccount AccountB;

        public TransactionTests()
        {
            // Create DB context and connect
            var connection = new MySqlConnector.MySqlConnection("DataSource=:memory:");
            var options = new DbContextOptionsBuilder<AssetgridDbContext>()
                .UseInMemoryDatabase("Transaction" + Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            Context = new AssetgridDbContext(options.Options);

            // Create user and log in
            UserService = new UserService(JwtSecret.Get(), Context);
            UserController = new UserController(Context, UserService);
            UserController.CreateInitial(new AuthenticateModel { Email = "test", Password = "test" });
            User = UserController.Authenticate(new AuthenticateModel { Email = "test", Password = "test" })!;
            UserService.MockUser = UserService.GetById(User.Id);

            // Setup account controller
            AccountController = new AccountController(Context, UserService);
            TransactionController = new TransactionController(Context, UserService, Options.Create<ApiBehaviorOptions>(null!));

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
                AccountNumber = null,
                Favorite = false,
                IncludeInNetWorth = false,
            };
            AccountA = AccountController.Create(accountModel);
            accountModel.Name = "B";
            AccountB = AccountController.Create(accountModel);
        }


        [Fact]
        public void CreateGetUpdateDelete()
        {
            var model = new ViewCreateTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };
            var transaction = TransactionController.Create(model).OkValue<ViewTransaction>();
            Assert.NotNull(transaction);
            Assert.Equal(transaction.Total, model.Total);
            Assert.Equal(transaction.DateTime, model.DateTime);
            Assert.Equal(transaction.Description, model.Description);
            Assert.Equal(transaction.Source!.Id, model.SourceId);
            Assert.Equal(transaction.Destination!.Id, model.DestinationId);
            Assert.Equal(transaction.Category, model.Category);

            transaction.DateTime = DateTime.Now.AddDays(-100);
            var updated = TransactionController.Update(transaction.Id, new ViewUpdateTransaction
            {
                DateTime = transaction.DateTime,
            }).OkValue<ViewTransaction>();
            Assert.Equivalent(transaction, updated);

            transaction.Destination = null;
            updated = TransactionController.Update(transaction.Id, new ViewUpdateTransaction
            {
                DestinationId = -1
            }).OkValue<ViewTransaction>();
            Assert.Equivalent(transaction, updated);
            Assert.Equivalent(updated, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            transaction.Description = "My description";
            updated = TransactionController.Update(transaction.Id, new ViewUpdateTransaction
            {
                Description = transaction.Description
            }).OkValue<ViewTransaction>();
            Assert.Equivalent(transaction, updated);
            Assert.Equivalent(updated, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            transaction.Category = "";
            updated = TransactionController.Update(transaction.Id, new ViewUpdateTransaction
            {
                Category = "",
            }).OkValue<ViewTransaction>();
            Assert.Equivalent(transaction, updated);
            Assert.Equivalent(updated, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            // Try to update with only read permission. Returns 403 Forbidden
            var userAccountA = Context.UserAccounts.Single(a => a.AccountId == AccountA.Id && a.UserId == User.Id);
            userAccountA.Permissions = UserAccountPermissions.Read;
            updated.Source!.Permissions = ViewAccount.AccountPermissions.Read;
            Context.SaveChanges();
            Assert.IsType<ForbidResult>(TransactionController.Update(transaction.Id, new ViewUpdateTransaction { Description = "Whatever" }));
            Assert.Equivalent(updated, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            // Try to update with write permissions. Succeeds
            userAccountA.Permissions = UserAccountPermissions.ModifyTransactions;
            Context.SaveChanges();
            updated = TransactionController.Update(transaction.Id, new ViewUpdateTransaction { Description = "Updated" }).OkValue<ViewTransaction>();
            Assert.Equivalent(updated, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            // Try to update without any permissions. Fails with 404 NotFound
            Context.Remove(userAccountA);
            Context.SaveChanges();
            Assert.IsType<NotFoundResult>(TransactionController.Get(transaction.Id));
            Assert.IsType<NotFoundResult>(TransactionController.Update(transaction.Id, new ViewUpdateTransaction { Description = "Whatever" }));

            // Attempt deletion
            Assert.Throws<Exception>(() => TransactionController.Delete(transaction.Id));

            userAccountA.Permissions = UserAccountPermissions.Read;
            Context.Add(userAccountA);
            Context.SaveChanges();
            Assert.Throws<Exception>(() => TransactionController.Delete(transaction.Id));

            userAccountA.Permissions = UserAccountPermissions.ModifyTransactions;
            Context.SaveChanges();
            TransactionController.Delete(transaction.Id);
            Assert.False(Context.Transactions.Any(t => t.Id == transaction.Id));
        }

        [Theory]
        [InlineData(UserAccountPermissions.ModifyTransactions)]
        [InlineData(UserAccountPermissions.All)]
        public void CreateTransactionWithPermission(UserAccountPermissions permissions)
        {
            var userAccount = Context.UserAccounts.Single(a => a.UserId == User.Id && a.AccountId == AccountA.Id);
            userAccount.Permissions = permissions;

            var model = new ViewCreateTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = null,
                DestinationId = null,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };

            model.SourceId = AccountA.Id;
            var transaction = TransactionController.Create(model).OkValue<ViewTransaction>();
            Assert.NotNull(transaction);
            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            model.SourceId = null;
            model.DestinationId = AccountA.Id;
            transaction = TransactionController.Create(model).OkValue<ViewTransaction>();
            Assert.NotNull(transaction);
            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());
        }

        [Theory]
        [InlineData(null)]
        [InlineData(UserAccountPermissions.Read)]
        public void CreateTransactionWithoutPermission(UserAccountPermissions? permissions)
        {
            var userAccount = Context.UserAccounts.Single(a => a.UserId == User.Id && a.AccountId == AccountA.Id);
            if (permissions != null)
            {
                userAccount.Permissions = permissions.Value;
            }
            else
            {
                Context.UserAccounts.Remove(userAccount);
            }
            Context.SaveChanges();

            var model = new ViewCreateTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = null,
                DestinationId = null,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };

            model.SourceId = AccountA.Id;
            Assert.IsType<ForbidResult>(TransactionController.Create(model));

            model.SourceId = null;
            model.DestinationId = AccountA.Id;
            Assert.IsType<ForbidResult>(TransactionController.Create(model));
        }

        [Fact]
        public void CreateTransactionSameSourceDestination()
        {
            var model = new ViewCreateTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountA.Id,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };

            var validationResultList = new List<ValidationResult>();
            bool result = Validator.TryValidateObject(model, new ValidationContext(model), validationResultList);
            Assert.False(result);
        }

        [Fact]
        public void CreateTransactionNoSourceDestination()
        {
            var model = new ViewCreateTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = null,
                DestinationId = null,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };
            var validationResultList = new List<ValidationResult>();
            bool result = Validator.TryValidateObject(model, new ValidationContext(model), validationResultList);
            Assert.False(result);
        }

        [Fact]
        public void CreateTransactionNegativeTotal()
        {
            var model = new ViewCreateTransaction
            {
                Total = -500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };
            var validationResultList = new List<ValidationResult>();
            bool result = Validator.TryValidateObject(model, new ValidationContext(model), validationResultList);
            Assert.True(result);
        }

        [Fact]
        public void UpdateOtherUsersTransaction()
        {
            var accountModel = new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            };
            var transactionModel = new ViewCreateTransaction
            {
                Total = -500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = null,
                DestinationId = null,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };

            var accountA = AccountController.Create(accountModel);
            var accountB = AccountController.Create(accountModel);
            transactionModel.SourceId = accountA.Id;
            transactionModel.DestinationId = accountB.Id;
            var transactionAB = TransactionController.Create(transactionModel).OkValue<ViewTransaction>();

            var otherUser = UserService.CreateUser("test2", "test");
            UserService.MockUser = otherUser;
            var accountC = AccountController.Create(accountModel);

            // Create transaction referencing only account C. Should succeed
            transactionModel.SourceId = null;
            transactionModel.DestinationId = accountC.Id;
            var transactionC = TransactionController.Create(transactionModel).OkValue<ViewTransaction>();
            Assert.NotNull(transactionC);

            // Update transaction to reference account A. Should fail since no write permission to this account
            Assert.IsType<ForbidResult>(TransactionController.Update(transactionC.Id, new ViewUpdateTransaction { SourceId = accountA.Id }));

            // Update transaction description. Should succeed
            transactionC.Description = "New test";
            Assert.Equivalent(transactionC, TransactionController.Update(transactionC.Id, new ViewUpdateTransaction { Description = transactionC.Description }).OkValue<ViewTransaction>());

            // Update description on transaction between A and B should fail due to no write permission
            Assert.IsType<NotFoundResult>(TransactionController.Update(transactionAB.Id, new ViewUpdateTransaction { Description = "Something" }));

            // Give read permission to account A
            var UserAccountA = new UserAccount { AccountId = accountA.Id, UserId = otherUser.Id, Permissions = UserAccountPermissions.Read };
            Context.UserAccounts.Add(UserAccountA);
            Context.SaveChanges();

            // Update still fails due to only read - no write permissions
            Assert.IsType<ForbidResult>(TransactionController.Update(transactionC.Id, new ViewUpdateTransaction { SourceId = accountA.Id }));
            Assert.IsType<ForbidResult>(TransactionController.Update(transactionAB.Id, new ViewUpdateTransaction { Description = "Something" }));

            // Change to write permissions - now it succeeds
            UserAccountA.Permissions = UserAccountPermissions.All;
            UserAccountA.IncludeInNetWorth = true;
            UserAccountA.Favorite = true;
            Context.SaveChanges();
            transactionC.Source = accountA;
            Assert.Equivalent(transactionC, TransactionController.Update(transactionC.Id, new ViewUpdateTransaction { SourceId = accountA.Id }).OkValue<ViewTransaction>());

            transactionAB.Description = "Something";
            // Transaction AB's source will be AccountB which otherUser does not have read access to. Therefore "Unknown account" will be returned.
            transactionAB.Source = ViewAccount.GetNoReadAccess(transactionAB.Source!.Id);
            Assert.Equivalent(transactionAB, TransactionController.Update(transactionAB.Id, new ViewUpdateTransaction { Description = "Something" }).OkValue<ViewTransaction>());

            // Can also change destination of AB transaction since we now have write access
            transactionAB.Destination = accountC;
            Assert.Equivalent(transactionAB, TransactionController.Update(transactionAB.Id, new ViewUpdateTransaction { DestinationId = accountC.Id }).OkValue<ViewTransaction>());
        }

        [Theory]
        [InlineData("source")]
        [InlineData("destination")]
        public void GetUpdateTransactionWithUnknownAccount(string unknownAccountType)
        {
            // Create a new user and account
            var otherUser = UserService.CreateUser("other", "test");
            UserService.MockUser = otherUser;
            var unknownAccount = AccountController.Create(new ViewCreateAccount
            {
                AccountNumber = "Test Account Number",
                Description = "This is a test",
                Favorite = true,
                IncludeInNetWorth = true,
                Name = "Test account"
            });

            var transactionModel = new ViewCreateTransaction
            {
                Total = 500,
                DateTime = DateTime.Now,
                Description = "Test description",
                SourceId = unknownAccountType == "source" ? unknownAccount.Id : AccountA.Id,
                DestinationId = unknownAccountType == "destination" ? unknownAccount.Id : AccountA.Id,
                Category = "My category",
                Lines = new List<ViewTransactionLine>()
            };

            // Cannot create transaction yet as no write permission to the unknown account
            UserService.MockUser = UserService.GetById(User.Id);
            Assert.IsType<ForbidResult>(TransactionController.Create(transactionModel));

            // Give read permission. Still fails
            var userAccount = new UserAccount { AccountId = unknownAccount.Id, UserId = User.Id, Permissions = UserAccountPermissions.Read };
            Context.UserAccounts.Add(userAccount);
            Context.SaveChanges();
            Assert.IsType<ForbidResult>(TransactionController.Create(transactionModel));

            // Change to write permission. Succeeds
            userAccount.Permissions = UserAccountPermissions.ModifyTransactions;
            Context.SaveChanges();
            var transaction = TransactionController.Create(transactionModel).OkValue<ViewTransaction>();
            Assert.NotNull(transaction);
            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            // Update description and verify that the update is correct
            transaction.Description = "Update 1";
            Assert.Equivalent(transaction, TransactionController.Update(transaction.Id, new ViewUpdateTransaction { Description = "Update 1" }).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            // Remove permission. Succeeds, but the account is shown as "uknown"
            Context.UserAccounts.Remove(userAccount);
            Context.SaveChanges();
            if (unknownAccountType == "source")
            {
                transaction.Source = ViewAccount.GetNoReadAccess(transaction.Source!.Id);
            }
            else
            {
                transaction.Destination = ViewAccount.GetNoReadAccess(transaction.Destination!.Id);
            }
            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());

            // Update description and verify that the update is correct
            transaction.Description = "Update 2";
            Assert.Equivalent(transaction, TransactionController.Update(transaction.Id, new ViewUpdateTransaction { Description = "Update 2" }).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());
        }

        [Fact]
        public void CreateUpdateNegativeTransaction()
        {
            var transaction = TransactionController.Create(new ViewCreateTransaction
            {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Total = 100,
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: 120, description: "Line 1"),
                    new ViewTransactionLine(amount: -20, description: "Line 2"),
                }
            }).OkValue<ViewTransaction>();
            var oppositeTransaction = TransactionController.Create(new ViewCreateTransaction
            {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = AccountB.Id,
                DestinationId = AccountA.Id,
                Total = 100,
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: 120, description: "Line 1"),
                    new ViewTransactionLine(amount: -20, description: "Line 2"),
                }
            }).OkValue<ViewTransaction>();

            Assert.Equivalent(transaction, TransactionController.Get(transaction.Id).OkValue<ViewTransaction>());
            Assert.Equivalent(oppositeTransaction, TransactionController.Get(oppositeTransaction.Id).OkValue<ViewTransaction>());

            // Create transaction with negative total
            var negativeTransaction = TransactionController.Create(new ViewCreateTransaction
            {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Total = -100,
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: -120, description: "Line 1"),
                    new ViewTransactionLine(amount: 20, description: "Line 2"),
                }
            }).OkValue<ViewTransaction>();
            // Update id so the equivalence check passes
            negativeTransaction.Id = oppositeTransaction.Id;
            Assert.Equivalent(negativeTransaction, oppositeTransaction);

            // Update transaction with negative total
            negativeTransaction = TransactionController.Update(transaction.Id, new ViewUpdateTransaction
            {
                Total = -100,
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: -120, description: "Line 1"),
                    new ViewTransactionLine(amount: 20, description: "Line 2"),
                }
            }).OkValue<ViewTransaction>();
            negativeTransaction.Id = oppositeTransaction.Id;
            Assert.Equivalent(negativeTransaction, oppositeTransaction);

            // Remove transaction lines and make total negative again
            var updatedTransaction = TransactionController.Update(transaction.Id, new ViewUpdateTransaction { Lines = new List<ViewTransactionLine>(), Total = -100 }).OkValue<ViewTransaction>();
            transaction.Lines = new List<ViewTransactionLine>();
            Assert.Equivalent(transaction, updatedTransaction);
        }

        [Theory]
        [InlineData(ViewAccount.AccountPermissions.All, ViewAccount.AccountPermissions.All)]
        [InlineData(ViewAccount.AccountPermissions.All, ViewAccount.AccountPermissions.ModifyTransactions)]
        [InlineData(ViewAccount.AccountPermissions.All, ViewAccount.AccountPermissions.Read)]
        [InlineData(ViewAccount.AccountPermissions.All, ViewAccount.AccountPermissions.None)]
        [InlineData(ViewAccount.AccountPermissions.ModifyTransactions, ViewAccount.AccountPermissions.All)]
        [InlineData(ViewAccount.AccountPermissions.ModifyTransactions, ViewAccount.AccountPermissions.ModifyTransactions)]
        [InlineData(ViewAccount.AccountPermissions.ModifyTransactions, ViewAccount.AccountPermissions.Read)]
        [InlineData(ViewAccount.AccountPermissions.ModifyTransactions, ViewAccount.AccountPermissions.None)]
        [InlineData(ViewAccount.AccountPermissions.Read, ViewAccount.AccountPermissions.All)]
        [InlineData(ViewAccount.AccountPermissions.Read, ViewAccount.AccountPermissions.ModifyTransactions)]
        [InlineData(ViewAccount.AccountPermissions.Read, ViewAccount.AccountPermissions.Read)]
        [InlineData(ViewAccount.AccountPermissions.Read, ViewAccount.AccountPermissions.None)]
        [InlineData(ViewAccount.AccountPermissions.None, ViewAccount.AccountPermissions.All)]
        [InlineData(ViewAccount.AccountPermissions.None, ViewAccount.AccountPermissions.ModifyTransactions)]
        [InlineData(ViewAccount.AccountPermissions.None, ViewAccount.AccountPermissions.Read)]
        [InlineData(ViewAccount.AccountPermissions.None, ViewAccount.AccountPermissions.None)]
        public void DeleteTransaction(ViewAccount.AccountPermissions accountAPermissions, ViewAccount.AccountPermissions accountBPermissions)
        {
            var model = new ViewCreateTransaction {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Total = 100,
                Lines = new List<ViewTransactionLine> {
                    new ViewTransactionLine(amount: 120, description: "Line 1"),
                    new ViewTransactionLine(amount: -20, description: "Line 2"),
                }
            };

            var transaction = TransactionController.Create(model).OkValue<ViewTransaction>();
            var aUserAccount = Context.UserAccounts.Single(a => a.AccountId == AccountA.Id && a.UserId == User.Id);
            var bUserAccount = Context.UserAccounts.Single(b => b.AccountId == AccountB.Id && b.UserId == User.Id);
            if (accountAPermissions == ViewAccount.AccountPermissions.None)
            {
                Context.Remove(aUserAccount);
            }
            else
            {
                aUserAccount.Permissions = (UserAccountPermissions)(accountAPermissions - 1);
            }
            if (accountBPermissions == ViewAccount.AccountPermissions.None)
            {
                Context.Remove(bUserAccount);
            }
            else
            {
                bUserAccount.Permissions = (UserAccountPermissions)(accountBPermissions - 1);
            }
            Context.SaveChanges();

            var canDeletePermissions = new[] { ViewAccount.AccountPermissions.ModifyTransactions, ViewAccount.AccountPermissions.All };
            if (canDeletePermissions.Contains(accountAPermissions) || canDeletePermissions.Contains(accountBPermissions))
            {
                // The user has write access to at least one account. Delete the transaction
                TransactionController.Delete(transaction.Id);
                Assert.IsType<NotFoundResult>(TransactionController.Get(transaction.Id));
            }
            else
            {
                Assert.Throws<Exception>(() => TransactionController.Delete(transaction.Id));
            }
        }

        [Fact]
        public void DeleteAllTransactions()
        {
            var otherUser = UserService.CreateUser("other", "test");
            UserService.MockUser = otherUser;
            var accountC = AccountController.Create(new ViewCreateAccount
            {
                Name = "C",
                Description = "no access",
                AccountNumber = null,
                Favorite = false,
                IncludeInNetWorth = false,
            });
            // Give the other user permission to create transactions on account A
            Context.Add(new UserAccount { AccountId = AccountA.Id, UserId = otherUser.Id, Permissions = UserAccountPermissions.ModifyTransactions });
            Context.SaveChanges();

            var model = new ViewCreateTransaction {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = accountC.Id,
                DestinationId = AccountA.Id,
                Total = 100,
                Lines = new List<ViewTransactionLine>()
            };
            var transactionCA = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = AccountA.Id;
            model.DestinationId = accountC.Id;
            var transactionAC = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = accountC.Id;
            model.DestinationId = null;
            var transactionC0 = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = null;
            model.DestinationId = accountC.Id;
            var transaction0C = TransactionController.Create(model).OkValue<ViewTransaction>();

            // Switch back to user A
            UserService.MockUser = UserService.GetById(User.Id);
            model.SourceId = AccountA.Id;
            model.DestinationId = AccountB.Id;
            var transactionAB = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = AccountA.Id;
            model.DestinationId = null;
            var transactionA0 = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = null;
            model.DestinationId = AccountB.Id;
            var transaction0B = TransactionController.Create(model).OkValue<ViewTransaction>();

            // Delete all transactions (query accepts all transactions)
            TransactionController.DeleteMultiple(new ViewSearchGroup
            {
                Type = ViewSearchGroupType.And,
                Children = new List<ViewSearchGroup>()
            });

            // Can delete own transactions
            Assert.IsType<NotFoundResult>(TransactionController.Get(transactionA0.Id));
            Assert.IsType<NotFoundResult>(TransactionController.Get(transaction0B.Id));
            Assert.IsType<NotFoundResult>(TransactionController.Get(transactionAB.Id));
            // Can delete shared transactions
            Assert.IsType<NotFoundResult>(TransactionController.Get(transactionCA.Id));
            Assert.IsType<NotFoundResult>(TransactionController.Get(transactionAC.Id));
            // Cannot delete other users transactions
            UserService.MockUser = otherUser;
            Assert.Equivalent(transactionC0, TransactionController.Get(transactionC0.Id).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction0C, TransactionController.Get(transaction0C.Id).OkValue<ViewTransaction>());

            // Give user read permission to account C
            var userAccount = new UserAccount { AccountId = accountC.Id, UserId = User.Id, Permissions = UserAccountPermissions.Read };
            Context.UserAccounts.Add(userAccount);
            Context.SaveChanges();

            UserService.MockUser = UserService.GetById(User.Id);
            TransactionController.DeleteMultiple(new ViewSearchGroup
            {
                Type = ViewSearchGroupType.And,
                Children = new List<ViewSearchGroup>()
            });

            // Stil cannot delete other users transactions
            UserService.MockUser = otherUser;
            Assert.Equivalent(transactionC0, TransactionController.Get(transactionC0.Id).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction0C, TransactionController.Get(transaction0C.Id).OkValue<ViewTransaction>());

            // Change permission to write
            userAccount.Permissions = UserAccountPermissions.ModifyTransactions;
            Context.SaveChanges();

            UserService.MockUser = UserService.GetById(User.Id);
            TransactionController.DeleteMultiple(new ViewSearchGroup
            {
                Type = ViewSearchGroupType.And,
                Children = new List<ViewSearchGroup>()
            });

            Assert.IsType<NotFoundResult>(TransactionController.Get(transactionC0.Id));
            Assert.IsType<NotFoundResult>(TransactionController.Get(transaction0C.Id));
            Assert.Empty(Context.Transactions);
        }

        [Fact]
        public void CreateTransactionWithUniqueIdentifier()
        {
            var otherUser = UserService.CreateUser("other", "test");
            var model = new ViewCreateTransaction
            {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = AccountA.Id,
                DestinationId = AccountB.Id,
                Total = 100,
                Lines = new List<ViewTransactionLine>(),
                Identifier = "Identifier"
            };

            // First creation succeeds
            TransactionController.Create(model);
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { model.Identifier }), new List<string> { model.Identifier });

            // Second creation fails due to duplicate identifier
            Assert.IsType<BadRequestResult>(TransactionController.Create(model));
            TransactionController.ModelState.Clear();
            model.SourceId = null;
            Assert.IsType<BadRequestResult>(TransactionController.Create(model));
            TransactionController.ModelState.Clear();
            model.SourceId = AccountA.Id;
            model.DestinationId = null;
            Assert.IsType<BadRequestResult>(TransactionController.Create(model));
            TransactionController.ModelState.Clear();

            UserService.MockUser = otherUser;
            var accountC = AccountController.Create(new ViewCreateAccount
            {
                Name = "C",
                Description = "no access",
                AccountNumber = null,
                Favorite = false,
                IncludeInNetWorth = false,
            });
            model.SourceId = accountC.Id;

            // Other user does not perceive the first transaction as a duplicate
            Assert.Empty(TransactionController.FindDuplicates(new List<string> { model.Identifier }));

            // Other user can create transaction without issue
            var transaction = TransactionController.Create(model).OkValue<ViewTransaction>();
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { model.Identifier }), new List<string> { model.Identifier });
            TransactionController.Delete(transaction.Id);

            // Share account A with otherUser
            Context.UserAccounts.Add(new UserAccount { AccountId = AccountA.Id, UserId = otherUser.Id, Permissions = UserAccountPermissions.Read });
            Context.SaveChanges();

            // Now creation fails, as otherUser can see the first users transaction with the same identifier
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { model.Identifier }), new List<string> { model.Identifier });
            Assert.IsType<BadRequestResult>(TransactionController.Create(model));
            TransactionController.ModelState.Clear();
        }

        [Fact]
        public void UpdateAllTransactions()
        {
            var otherUser = UserService.CreateUser("other", "test");
            UserService.MockUser = otherUser;
            var accountC = AccountController.Create(new ViewCreateAccount
            {
                Name = "C",
                Description = "no access",
                AccountNumber = null,
                Favorite = false,
                IncludeInNetWorth = false,
            });
            // Give the other user permission to create transactions on account A
            Context.Add(new UserAccount { AccountId = AccountA.Id, UserId = otherUser.Id, Permissions = UserAccountPermissions.ModifyTransactions });
            Context.SaveChanges();

            var model = new ViewCreateTransaction {
                Category = "",
                DateTime = new DateTime(2020, 01, 01),
                Description = "Test transaction",
                SourceId = accountC.Id,
                DestinationId = AccountA.Id,
                Total = 100,
                Lines = new List<ViewTransactionLine>()
            };
            var transactionCA = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = AccountA.Id;
            model.DestinationId = accountC.Id;
            var transactionAC = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = accountC.Id;
            model.DestinationId = null;
            var transactionC0 = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = null;
            model.DestinationId = accountC.Id;
            var transaction0C = TransactionController.Create(model).OkValue<ViewTransaction>();

            // Switch back to user A
            UserService.MockUser = UserService.GetById(User.Id);
            model.SourceId = AccountA.Id;
            model.DestinationId = AccountB.Id;
            var transactionAB = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = AccountA.Id;
            model.DestinationId = null;
            var transactionA0 = TransactionController.Create(model).OkValue<ViewTransaction>();
            model.SourceId = null;
            model.DestinationId = AccountB.Id;
            var transaction0B = TransactionController.Create(model).OkValue<ViewTransaction>();

            // Update all transactions (query accepts all transactions)
            TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions {
                model = new ViewUpdateTransaction { Description = "Updated" },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            });

            // Can update own transactions
            Assert.Equal("Updated", TransactionController.Get(transactionA0.Id).OkValue<ViewTransaction>().Description);
            Assert.Equal("Updated", TransactionController.Get(transaction0B.Id).OkValue<ViewTransaction>().Description);
            Assert.Equal("Updated", TransactionController.Get(transactionAB.Id).OkValue<ViewTransaction>().Description);
            // Can update shared transactions
            Assert.Equal("Updated", TransactionController.Get(transactionCA.Id).OkValue<ViewTransaction>().Description);
            Assert.Equal("Updated", TransactionController.Get(transactionAC.Id).OkValue<ViewTransaction>().Description);
            // Cannot update other users transactions
            UserService.MockUser = otherUser;
            Assert.Equivalent(transactionC0, TransactionController.Get(transactionC0.Id).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction0C, TransactionController.Get(transaction0C.Id).OkValue<ViewTransaction>());

            // Cannot change source or destination to destination with no write permission
            // Process fails silently but nothing is updated
            UserService.MockUser = UserService.GetById(User.Id);
            Assert.IsType<OkResult>(TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions
            {
                model = new ViewUpdateTransaction { DestinationId = accountC.Id },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            }));
            Assert.IsType<OkResult>(TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions
            {
                model = new ViewUpdateTransaction { SourceId = accountC.Id },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            }));
            Assert.Equivalent(transactionA0.Source, TransactionController.Get(transactionA0.Id).OkValue<ViewTransaction>().Source);
            Assert.Equivalent(transaction0B.Source, TransactionController.Get(transaction0B.Id).OkValue<ViewTransaction>().Source);
            Assert.Equivalent(transactionAB.Source, TransactionController.Get(transactionAB.Id).OkValue<ViewTransaction>().Source);
            Assert.Equivalent(transactionA0.Destination, TransactionController.Get(transactionA0.Id).OkValue<ViewTransaction>().Destination);
            Assert.Equivalent(transaction0B.Destination, TransactionController.Get(transaction0B.Id).OkValue<ViewTransaction>().Destination);
            Assert.Equivalent(transactionAB.Destination, TransactionController.Get(transactionAB.Id).OkValue<ViewTransaction>().Destination);

            // Give user read permission to account C
            var userAccount = new UserAccount { AccountId = accountC.Id, UserId = User.Id, Permissions = UserAccountPermissions.Read };
            Context.UserAccounts.Add(userAccount);
            Context.SaveChanges();

            TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions {
                model = new ViewUpdateTransaction { Description = "Updated" },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            });

            // Stil cannot update other users transactions
            UserService.MockUser = otherUser;
            Assert.Equivalent(transactionC0, TransactionController.Get(transactionC0.Id).OkValue<ViewTransaction>());
            Assert.Equivalent(transaction0C, TransactionController.Get(transaction0C.Id).OkValue<ViewTransaction>());

            // Still fails when trying to update source and destination to account C
            UserService.MockUser = UserService.GetById(User.Id);
            Assert.IsType<OkResult>(TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions
            {
                model = new ViewUpdateTransaction { DestinationId = accountC.Id },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            }));
            Assert.IsType<OkResult>(TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions
            {
                model = new ViewUpdateTransaction { SourceId = accountC.Id },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            }));
            Assert.Equivalent(transactionA0.Source, TransactionController.Get(transactionA0.Id).OkValue<ViewTransaction>().Source);
            Assert.Equivalent(transaction0B.Source, TransactionController.Get(transaction0B.Id).OkValue<ViewTransaction>().Source);
            Assert.Equivalent(transactionAB.Source, TransactionController.Get(transactionAB.Id).OkValue<ViewTransaction>().Source);
            Assert.Equivalent(transactionA0.Destination, TransactionController.Get(transactionA0.Id).OkValue<ViewTransaction>().Destination);
            Assert.Equivalent(transaction0B.Destination, TransactionController.Get(transaction0B.Id).OkValue<ViewTransaction>().Destination);
            Assert.Equivalent(transactionAB.Destination, TransactionController.Get(transactionAB.Id).OkValue<ViewTransaction>().Destination);

            // Change permission to write
            userAccount.Permissions = UserAccountPermissions.ModifyTransactions;
            Context.SaveChanges();

            TransactionController.UpdateMultiple(new ViewUpdateMultipleTransactions {
                model = new ViewUpdateTransaction { Description = "Updated" },
                query = new ViewSearchGroup { Type = ViewSearchGroupType.And, Children = new List<ViewSearchGroup>() }
            });

            Assert.Equal("Updated", TransactionController.Get(transactionC0.Id).OkValue<ViewTransaction>().Description);
            Assert.Equal("Updated", TransactionController.Get(transaction0C.Id).OkValue<ViewTransaction>().Description);
        }

        [Fact]
        public void CreateMany()
        {
            var otherUser = UserService.CreateUser("other", "test");
            UserService.MockUser = otherUser;
            var accountC = AccountController.Create(new ViewCreateAccount
            {
                Name = "C",
                Description = "no access",
                AccountNumber = null,
                Favorite = false,
                IncludeInNetWorth = false,
            });

            UserService.MockUser = UserService.GetById(User.Id);
            var result = TransactionController.CreateMany(new List<ViewCreateTransaction>
            {
                new ViewCreateTransaction {
                    Identifier = "identifier",
                    Total = 100,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                },
                new ViewCreateTransaction {
                    Total = 200,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "inverse",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                },
                new ViewCreateTransaction {
                    Total = 300,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = AccountA.Id,
                    DestinationId = accountC.Id,
                    Category = ""
                },
                new ViewCreateTransaction {
                    Total = 400,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = accountC.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                }
            });

            // First transaction should succeed
            Assert.Single(result.Succeeded.Where(x => x.Total == 100));

            // Second transaction should also succeed
            Assert.Single(result.Succeeded.Where(x => x.Total == 200));

            // Cannot create transaction to account C
            Assert.Equal(2, result.Failed.Count);
            Assert.Single(result.Failed.Where(x => x.Total == 300));
            Assert.Single(result.Failed.Where(x => x.Total == 400));

            // Cannot create other transaction with same identifier
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { "identifier" }), new [] { "identifier" });
            result = TransactionController.CreateMany(new List<ViewCreateTransaction> {
                new ViewCreateTransaction {
                    Identifier = "identifier",
                    Total = 100,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id
                },
            });
            Assert.Single(result.Duplicate);
            Assert.Empty(result.Failed);
            Assert.Empty(result.Succeeded);
        }

        [Fact]
        public void CreateManySameIdentifier()
        {
            // Will create one transaction and mark reject other as a duplicate
            var result = TransactionController.CreateMany(new List<ViewCreateTransaction>
            {
                new ViewCreateTransaction {
                    Identifier = "identifier",
                    Total = 100,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                },
                new ViewCreateTransaction {
                    Identifier = "identifier",
                    Total = 200,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                },
            });
            Assert.Single(result.Succeeded);
            Assert.Equal(100, result.Succeeded.Single().Total);
            Assert.Single(result.Duplicate);
            Assert.Equal(200, result.Duplicate.Single().Total);
            Assert.Empty(result.Failed);

            // Try to create transaction with same identifier as other user. It should work
            var otherUser = UserService.CreateUser("other", "test");
            UserService.MockUser = otherUser;
            var accountC = AccountController.Create(new ViewCreateAccount
            {
                Name = "C",
                Description = "no access",
                AccountNumber = null,
                Favorite = false,
                IncludeInNetWorth = false,
            });
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { "identifier" }), new string [0]);
            result = TransactionController.CreateMany(new List<ViewCreateTransaction>
            {
                new ViewCreateTransaction {
                    Identifier = "identifier",
                    Total = 100,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = accountC.Id,
                    DestinationId = null,
                    Category = ""
                },
            });
            Assert.Single(result.Succeeded);
            Assert.Equal(100, result.Succeeded.Single().Total);
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { "identifier" }), new [] { "identifier" });

            var transaction = TransactionController.Search(new ViewSearch
            {
                From = 0,
                To = 1,
                Query = new ViewSearchGroup
                {
                    Type = ViewSearchGroupType.And,
                    Children = new List<ViewSearchGroup>()
                }
            }).Data.Single();
            TransactionController.Delete(transaction.Id);
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { "identifier" }), new string [0]);

            // Share an account with other user. Now creating should fail
            Context.UserAccounts.Add(new UserAccount { UserId = otherUser.Id, AccountId = AccountA.Id });
            Context.SaveChanges();

            result = TransactionController.CreateMany(new List<ViewCreateTransaction>
            {
                new ViewCreateTransaction {
                    Identifier = "identifier",
                    Total = 100,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "test",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                },
            });
            Assert.Single(result.Failed);
            Assert.Equal(100, result.Failed.Single().Total);
            Assert.Equivalent(TransactionController.FindDuplicates(new List<string> { "identifier" }), new [] { "identifier" });
        }

        [Fact]
        public void CreateManyNegativeTotal()
        {
            var lines = new List<ViewTransactionLine>
            {
                new ViewTransactionLine(amount: 100, description: "Line"),
                new ViewTransactionLine(amount: 150, description: "Line"),
                new ViewTransactionLine(amount: -350, description:  "Line"),
                new ViewTransactionLine(amount: -100, description:  "Line")
            };
            var result = TransactionController.CreateMany(new List<ViewCreateTransaction>
            {
                new ViewCreateTransaction {
                    Identifier = "",
                    Total = -100,
                    Lines = new List<ViewTransactionLine>(),
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "A",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = ""
                },
                new ViewCreateTransaction {
                    Identifier = null,
                    Total = -200,
                    Lines = lines,
                    DateTime = new DateTime(2020, 01, 01),
                    Description = "B",
                    SourceId = AccountA.Id,
                    DestinationId = AccountB.Id,
                    Category = "",
                },
            });

            Assert.Equal(2, result.Succeeded.Count);
            Assert.Empty(result.Duplicate);
            Assert.Empty(result.Failed);
            var transactions = TransactionController.Search(new ViewSearch {
                From = 0,
                To = 20,
                Query = new ViewSearchGroup
                {
                    Type = ViewSearchGroupType.And,
                    Children = new List<ViewSearchGroup>()
                }
            }).Data;

            var transactionA = transactions.Single(t => t.Description == "A");
            Assert.Equal(100, transactionA.Total);
            Assert.Equal(AccountB.Id, transactionA.Source!.Id);
            Assert.Equal(AccountA.Id, transactionA.Destination!.Id);
            Assert.Empty(transactionA.Lines);

            var transactionB = transactions.Single(t => t.Description == "B");
            Assert.Equal(200, transactionB.Total);
            Assert.Equal(AccountB.Id, transactionB.Source!.Id);
            Assert.Equal(AccountA.Id, transactionB.Destination!.Id);
            Assert.Equivalent(lines.Select(item => new ViewTransactionLine(-item.Amount, item.Description)), transactionB.Lines);
        }
    }

}
