using System;
using System.Collections.Generic;
using System.Linq;
using assetgrid_backend.Controllers;
using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.ViewModels;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using Xunit;

namespace backend.unittests.Tests
{
    public class MetaTests : TestBase
    {
        public ViewAccount AccountA;
        public ViewAccount AccountB;
        public ViewTransaction TransactionA;
        public ViewTransaction TransactionB;

        public MetaTests() : base()
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
            TransactionA = TransactionController.Create(transactionModel).Result.OkValue<ViewTransaction>();
            transactionModel.SourceId = AccountB.Id;
            TransactionB = TransactionController.Create(transactionModel).Result.OkValue<ViewTransaction>();
        }

        [Theory]
        [InlineData(MetaFieldValueType.TextLine)]
        [InlineData(MetaFieldValueType.TextLong)]
        [InlineData(MetaFieldValueType.Boolean)]
        [InlineData(MetaFieldValueType.Number)]
        public async void CreateAndSetPrimitiveField(MetaFieldValueType fieldType)
        {
            var field = (await MetaController.Create(new ViewCreateMetaField
            {
                Name = "Test",
                Description = "Test field",
                Type = MetaFieldType.Transaction,
                ValueType = fieldType
            })).OkValue<ViewMetaField>();

            // Create the field
            var fields = (await MetaController.List()).OkValue<List<ViewMetaField>>();
            Assert.Single(fields);
            Assert.Equal(fields.First().Id, field.Id);

            // Check that it shows on a transaction
            var transaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(transaction.MetaData);
            Assert.Single(transaction.MetaData);
            Assert.Null(transaction.MetaData.First().Value);
            Assert.Equal(transaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(transaction.MetaData.First().Type, field.ValueType);

            object? value = null;
            switch (fieldType)
            {
                case MetaFieldValueType.TextLine:
                case MetaFieldValueType.TextLong:
                    value = "TEST";
                    break;
                case MetaFieldValueType.Boolean:
                    value = true;
                    break;
                case MetaFieldValueType.Number:
                    value = "5001234";
                    break;
            }
            if (value == null) throw new Exception("Value cannot be null");

            // Set the value of the field
            await TransactionController.Update(TransactionA.Id, new ViewModifyTransaction
            {
                Description = TransactionA.Description,
                Identifiers = TransactionA.Identifiers,
                Lines = TransactionA.Lines,
                DateTime = TransactionA.DateTime,
                DestinationId = TransactionA.Destination?.Id,
                IsSplit = TransactionA.IsSplit,
                SourceId = TransactionA.Source?.Id,
                Total = TransactionA.Total,
                TotalString = TransactionA.TotalString,
                MetaData = new List<ViewSetMetaField> {
                    new ViewSetMetaField {
                        MetaId = field.Id,
                        Value = value
                    }
                }
            });

            // Check that it shows on a transaction
            var modifiedTransaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(modifiedTransaction.MetaData);
            Assert.Single(modifiedTransaction.MetaData);
            Assert.Equal(modifiedTransaction.MetaData.First().Value, value);
            Assert.Equal(modifiedTransaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(modifiedTransaction.MetaData.First().Type, field.ValueType);
        }

        [Fact]
        public async void CreateAndSetTransactionField()
        {
            var field = (await MetaController.Create(new ViewCreateMetaField
            {
                Name = "Test",
                Description = "Test field",
                Type = MetaFieldType.Transaction,
                ValueType = MetaFieldValueType.Transaction
            })).OkValue<ViewMetaField>();

            // Create the field
            var fields = (await MetaController.List()).OkValue<List<ViewMetaField>>();
            Assert.Single(fields);
            Assert.Equal(fields.First().Id, field.Id);

            // Check that it shows on a transaction
            var transaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(transaction.MetaData);
            Assert.Single(transaction.MetaData);
            Assert.Null(transaction.MetaData.First().Value);
            Assert.Equal(transaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(transaction.MetaData.First().Type, field.ValueType);

            // Set the value of the field
            await TransactionController.Update(TransactionA.Id, new ViewModifyTransaction
            {
                Description = TransactionA.Description,
                Identifiers = TransactionA.Identifiers,
                Lines = TransactionA.Lines,
                DateTime = TransactionA.DateTime,
                DestinationId = TransactionA.Destination?.Id,
                IsSplit = TransactionA.IsSplit,
                SourceId = TransactionA.Source?.Id,
                Total = TransactionA.Total,
                TotalString = TransactionA.TotalString,
                MetaData = new List<ViewSetMetaField> {
                    new ViewSetMetaField {
                        MetaId = field.Id,
                        Value = TransactionB.Id
                    }
                }
            });

            // Check that it shows on a transaction
            var modifiedTransaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(modifiedTransaction.MetaData);
            Assert.Single(modifiedTransaction.MetaData);
            Assert.Equal(((ViewTransaction)modifiedTransaction.MetaData.First().Value!).Id, TransactionB.Id);
            Assert.Equal(modifiedTransaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(modifiedTransaction.MetaData.First().Type, field.ValueType);

            // Modify account B so the user no longer has read access
            var userAccount = Context.UserAccounts
                .Single(account => account.UserId == UserA.Id && account.AccountId == AccountB.Id);
            Context.UserAccounts.Remove(userAccount);
            Context.SaveChanges();

            modifiedTransaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(modifiedTransaction.MetaData);
            Assert.Single(modifiedTransaction.MetaData);
            Assert.Null(modifiedTransaction.MetaData.First().Value);
            Assert.Equal(modifiedTransaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(modifiedTransaction.MetaData.First().Type, field.ValueType);

            // Set the value of the field to transaction B once again
            // This time, the user cannot see the transaction
            Assert.Throws(typeof(AggregateException), () => TransactionController.Update(TransactionA.Id, new ViewModifyTransaction
            {
                Description = TransactionA.Description,
                Identifiers = TransactionA.Identifiers,
                Lines = TransactionA.Lines,
                DateTime = TransactionA.DateTime,
                DestinationId = TransactionA.Destination?.Id,
                IsSplit = TransactionA.IsSplit,
                SourceId = TransactionA.Source?.Id,
                Total = TransactionA.Total,
                TotalString = TransactionA.TotalString,
                MetaData = new List<ViewSetMetaField> {
                    new ViewSetMetaField {
                        MetaId = field.Id,
                        Value = TransactionB.Id
                    }
                }
            }).Wait());
        }

        [Fact]
        public async void CreateAndSetAccountField()
        {
            var field = (await MetaController.Create(new ViewCreateMetaField
            {
                Name = "Test",
                Description = "Test field",
                Type = MetaFieldType.Transaction,
                ValueType = MetaFieldValueType.Account
            })).OkValue<ViewMetaField>();

            // Create the field
            var fields = (await MetaController.List()).OkValue<List<ViewMetaField>>();
            Assert.Single(fields);
            Assert.Equal(fields.First().Id, field.Id);

            // Check that it shows on a transaction
            var transaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(transaction.MetaData);
            Assert.Single(transaction.MetaData);
            Assert.Null(transaction.MetaData.First().Value);
            Assert.Equal(transaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(transaction.MetaData.First().Type, field.ValueType);

            // Set the value of the field
            await TransactionController.Update(TransactionA.Id, new ViewModifyTransaction
            {
                Description = TransactionA.Description,
                Identifiers = TransactionA.Identifiers,
                Lines = TransactionA.Lines,
                DateTime = TransactionA.DateTime,
                DestinationId = TransactionA.Destination?.Id,
                IsSplit = TransactionA.IsSplit,
                SourceId = TransactionA.Source?.Id,
                Total = TransactionA.Total,
                TotalString = TransactionA.TotalString,
                MetaData = new List<ViewSetMetaField> {
                    new ViewSetMetaField {
                        MetaId = field.Id,
                        Value = AccountB.Id
                    }
                }
            });

            // Check that it shows on a transaction
            var modifiedTransaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(modifiedTransaction.MetaData);
            Assert.Single(modifiedTransaction.MetaData);
            Assert.Equal(((ViewAccount)modifiedTransaction.MetaData.First().Value!).Id, AccountB.Id);
            Assert.Equal(modifiedTransaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(modifiedTransaction.MetaData.First().Type, field.ValueType);

            // Modify account B so the user no longer has read access
            var userAccount = Context.UserAccounts
                .Single(account => account.UserId == UserA.Id && account.AccountId == AccountB.Id);
            Context.UserAccounts.Remove(userAccount);
            Context.SaveChanges();

            modifiedTransaction = (await TransactionController.Get(TransactionA.Id)).OkValue<ViewTransaction>();
            Assert.NotNull(modifiedTransaction.MetaData);
            Assert.Single(modifiedTransaction.MetaData);
            Assert.Equal(((ViewAccount)modifiedTransaction.MetaData.First().Value!).Id, AccountB.Id);
            Assert.Equal(((ViewAccount)modifiedTransaction.MetaData.First().Value!).Permissions, ViewAccount.AccountPermissions.None);
            Assert.Equal(modifiedTransaction.MetaData.First().MetaName, field.Name);
            Assert.Equal(modifiedTransaction.MetaData.First().Type, field.ValueType);

            // Set the value of the field to account B once again
            // This time, the user cannot see the transaction
            Assert.Throws(typeof(AggregateException), () => TransactionController.Update(TransactionA.Id, new ViewModifyTransaction
            {
                Description = TransactionA.Description,
                Identifiers = TransactionA.Identifiers,
                Lines = TransactionA.Lines,
                DateTime = TransactionA.DateTime,
                DestinationId = TransactionA.Destination?.Id,
                IsSplit = TransactionA.IsSplit,
                SourceId = TransactionA.Source?.Id,
                Total = TransactionA.Total,
                TotalString = TransactionA.TotalString,
                MetaData = new List<ViewSetMetaField> {
                    new ViewSetMetaField {
                        MetaId = field.Id,
                        Value = TransactionB.Id
                    }
                }
            }).Wait());
        }
    }
}