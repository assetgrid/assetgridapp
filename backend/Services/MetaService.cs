using assetgrid_backend.Data;
using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.ViewModels;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.EntityFrameworkCore.Query.Internal;
using Microsoft.EntityFrameworkCore.Storage;
using System.Collections.Generic;
using System.Data.Entity.Core.Objects;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace assetgrid_backend.Services
{
    public interface IMetaService
    {
        Task<List<ViewMetaFieldValue>> GetTransactionMetaValues(int transactionId, int userId);
        Task SetTransactionMetaValues(int transactionId, int userId, List<ViewSetMetaField> values);
        Task<Dictionary<int, MetaField>> GetFields(int userId);
        void SetTransactionMetaValues(
            Transaction transaction,
            List<ViewSetMetaField> values,
            Dictionary<int, MetaField> fields,
            HashSet<int> writeableAccountIds,
            HashSet<int> writeableTransactionIds
        );
    }

    public class MetaService : IMetaService
    {
        private readonly AssetgridDbContext _context;
        private readonly AttachmentService _attachment;
        public MetaService(AssetgridDbContext context, AttachmentService attachment)
        {
            _context = context;
            _attachment = attachment;
        }

        internal struct MetaValue
        {
            public int FieldId { get; set; }
            public string FieldName { get; set; }
            public MetaFieldValueType FieldType { get; set; }
            public string? TextShortValue { get; set; }
            public string? TextLongValue { get; set; }
            public string? AttachmentValue { get; set; }
            public bool? BooleanValue { get; set; }
            public long? NumberValue { get; set; }
            public ViewAccount? AccountValue { get; set; }
            public ViewTransaction? TransactionValue { get; set; }
    }

        public async Task<List<ViewMetaFieldValue>> GetTransactionMetaValues(int transactionId, int userId)
        {
            var metaFields = await _context.UserMetaFields
                .Include(x => x.Field.TransactionMetaTextLong!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaTextLine!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaAttachment!.Where(xx => xx.ObjectId == transactionId))
                    .ThenInclude(x => x.Value)
                .Include(x => x.Field.TransactionMetaBoolean!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaNumber!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaAccount!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaTransaction!.Where(xx => xx.ObjectId == transactionId))
                .Where(x => x.UserId == userId)
                .ToListAsync();

            var accountIds = metaFields
                .Where(x => x.Field.TransactionMetaAccount != null)
                .SelectMany(x => x.Field.TransactionMetaAccount!.Select(xx => (int?)xx.ValueId))
                .Where(x => x != null)
                .ToList();
            var accounts = await _context.UserAccounts
                .Where(account => account.UserId == userId && accountIds.Contains(account.AccountId))
                .SelectView()
                .ToDictionaryAsync(x => x.Id, x => x);

            var transactionIds = metaFields
                .Where(x => x.Field.TransactionMetaTransaction != null)
                .SelectMany(x => x.Field.TransactionMetaTransaction!.Select(xx => (int?)xx.ValueId))
                .Where(x => x != null)
                .ToList();
            var transactions = await _context.Transactions
                .Where(transaction => _context.UserAccounts.Any(account => account.UserId == userId &&
                    (account.AccountId == transaction.SourceAccountId || account.AccountId == transaction.DestinationAccountId)))
                .SelectView(userId)
                .ToDictionaryAsync(x => x.Id, x => x);

            return metaFields.Select(x => new ViewMetaFieldValue
            {
                MetaId = x.FieldId,
                MetaName = x.Field.Name,
                Type = x.Field.ValueType,
                Value = x.Field.ValueType switch
                {
                    MetaFieldValueType.TextLine => x.Field.TransactionMetaTextLine?.SingleOrDefault()?.Value,
                    MetaFieldValueType.TextLong => x.Field.TransactionMetaTextLong?.SingleOrDefault()?.Value,
                    MetaFieldValueType.Attachment => x.Field.TransactionMetaAttachment?.Select(x => new
                    {
                        Id = x.Value.Id,
                        Name = x.Value.FileName,
                        FileSize = x.Value.FileSize
                    }).SingleOrDefault(),
                    MetaFieldValueType.Boolean => x.Field.TransactionMetaBoolean?.SingleOrDefault()?.Value,
                    MetaFieldValueType.Number => x.Field.TransactionMetaNumber?.SingleOrDefault()?.Value.ToString(),
                    MetaFieldValueType.Account => x.Field.TransactionMetaAccount?.SingleOrDefault()?.ValueId != null
                        ? (accounts.ContainsKey(x.Field.TransactionMetaAccount.SingleOrDefault()!.ValueId)
                            ? accounts[x.Field.TransactionMetaAccount.SingleOrDefault()!.ValueId]
                            : ViewAccount.GetNoReadAccess(x.Field.TransactionMetaAccount.SingleOrDefault()!.ValueId)
                        ) : null,
                    MetaFieldValueType.Transaction => x.Field.TransactionMetaTransaction?.SingleOrDefault()?.ValueId != null &&
                            transactions.ContainsKey(x.Field.TransactionMetaTransaction.SingleOrDefault()!.ValueId)
                        ? transactions[x.Field.TransactionMetaTransaction.SingleOrDefault()!.ValueId]
                        : null,
                    _ => throw new Exception("Unknown meta field value type")
                }
            }).ToList();
        }

        public async Task<Dictionary<int, MetaField>> GetFields(int userId)
        {
            return (await _context.UserMetaFields
                .Include(x => x.Field)
                .Where(x => x.UserId == userId)
                .ToListAsync())
                .ToDictionary(x => x.FieldId, x => x.Field);
        }

        public async Task SetTransactionMetaValues(int transactionId, int userId, List<ViewSetMetaField> values)
        {
            var fields = await GetFields(userId);
            List<int> referencedTransactionIds = new List<int>{ transactionId };
            foreach (var value in values)
            {
                if (fields.ContainsKey(value.MetaId) && fields[value.MetaId].ValueType == MetaFieldValueType.Transaction)
                {
                    int? transactionIdValue = value.Value switch
                    {
                        JsonElement x => x.ValueKind == JsonValueKind.Number ? x.GetInt32() : null,
                        int x => x,
                        null => null,
                        _ => throw new Exception("Incorrect type of value")
                    };
                    if (transactionIdValue != null)
                    {
                        referencedTransactionIds.Add(transactionIdValue.Value);
                    }
                }
            }

            var writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
            var writeableTransactionIds = (await _context.Transactions
                .Where(x => referencedTransactionIds.Contains(x.Id))
                .Where(x => x.SourceAccount!.Users!.Any(x => x.UserId == userId && writePermissions.Contains(x.Permissions)) ||
                    x.DestinationAccount!.Users!.Any(x => x.UserId == userId && writePermissions.Contains(x.Permissions)))
                .Select(x => x.Id)
                .ToListAsync())
                .ToHashSet();
            var transaction = await _context.Transactions
                .Include(x => x.MetaAccountValues)
                .Include(x => x.MetaAttachmentValues)
                .Include(x => x.MetaBooleanValues)
                .Include(x => x.MetaNumberValues)
                .Include(x => x.MetaTextLineValues)
                .Include(x => x.MetaTextLongValues)
                .Include(x => x.MetaTransactionValues)
                .Where(x => x.Id == transactionId && writeableTransactionIds.Contains(x.Id))
                .SingleAsync();
            var writeableAccountIds = (await _context.UserAccounts
                .Where(x => x.UserId == userId && writePermissions.Contains(x.Permissions))
                .Select(x => x.AccountId)
                .ToListAsync())
                .ToHashSet();

            SetTransactionMetaValues(transaction, values, fields, writeableAccountIds, writeableTransactionIds);
        }

        public void SetTransactionMetaValues(
            Transaction transaction,
            List<ViewSetMetaField> values,
            Dictionary<int, MetaField> fields,
            HashSet<int> writeableAccountIds,
            HashSet<int> writeableTransactionIds
        )
        {
            foreach (var fieldValue in values)
            {
                if (!fields.TryGetValue(fieldValue.MetaId, out MetaField? field))
                {
                    // Cannot set a field that doesn't exist
                    continue;
                }

                switch (field.ValueType)
                {
                    case MetaFieldValueType.TextLine:
                        {
                            var value = fieldValue.Value switch
                            {
                                JsonElement x => x.ValueKind == JsonValueKind.String ? x.GetString() : null,
                                string x => x,
                                null => null,
                                _ => throw new Exception("Incorrect type of value")
                            };

                            var previousValue = transaction.MetaTextLineValues!.SingleOrDefault(x => x.FieldId == field.Id);
                            if (previousValue != null) {
                                transaction.MetaTextLineValues!.Remove(previousValue);
                            }
                            if (value != null)
                            {
                                transaction.MetaTextLineValues!.Add(new MetaTextLine<Transaction>
                                {
                                    Value = value,
                                    FieldId = field.Id
                                });
                            }
                            break;
                        }
                    case MetaFieldValueType.TextLong:
                        {
                            var value = fieldValue.Value switch
                            {
                                JsonElement x => x.ValueKind == JsonValueKind.String ? x.GetString() : null,
                                string x => x,
                                null => null,
                                _ => throw new Exception("Incorrect type of value")
                            };

                            var previousValue = transaction.MetaTextLongValues!.SingleOrDefault(x => x.FieldId == field.Id);
                            if (previousValue != null) {
                                transaction.MetaTextLongValues!.Remove(previousValue);
                            }
                            if (value != null)
                            {
                                transaction.MetaTextLongValues!.Add(new MetaTextLong<Transaction>
                                {
                                    Value = value,
                                    FieldId = field.Id
                                });
                            }
                            break;
                        }
                    case MetaFieldValueType.Boolean:
                        {
                            bool? value = fieldValue.Value switch
                            {
                                JsonElement x => x.ValueKind == JsonValueKind.True || x.ValueKind == JsonValueKind.False ? x.GetBoolean() : null,
                                bool x => x,
                                null => null,
                                _ => throw new Exception("Incorrect type of value")
                            };

                            var previousValue = transaction.MetaBooleanValues!.SingleOrDefault(x => x.FieldId == field.Id);
                            if (previousValue != null)
                            {
                                if (value != null && value.Value == true)
                                {
                                    previousValue.Value = value.Value;
                                }
                                else
                                {
                                    transaction.MetaBooleanValues!.Remove(previousValue);
                                }
                            }
                            else if (value != null && value.Value == true)
                            {
                                transaction.MetaBooleanValues!.Add(new MetaBoolean<Transaction>
                                {
                                    Value = value.Value,
                                    FieldId = field.Id
                                });
                            }
                            break;
                        }
                    case MetaFieldValueType.Number:
                        {
                            // The numeric field is transfered as a string to prevent floating point errors
                            string? stringValue = fieldValue.Value switch
                            {
                                JsonElement x => x.ValueKind == JsonValueKind.String ? x.GetString() : null,
                                string x => x,
                                null => null,
                                _ => throw new Exception("Incorrect type of value")
                            };
                            long? value = null;
                            if (long.TryParse(stringValue, out long newValue))
                            {
                                value = newValue;
                            }

                            var previousValue = transaction.MetaNumberValues!.SingleOrDefault(x => x.FieldId == field.Id);
                            if (previousValue != null) {
                                transaction.MetaNumberValues!.Remove(previousValue);
                            }
                            if (value != null)
                            {
                                transaction.MetaNumberValues!.Add(new MetaNumber<Transaction>
                                {
                                    Value = value.Value,
                                    FieldId = field.Id
                                });
                            }
                            break;
                        }
                    case MetaFieldValueType.Account:
                        {
                            // The numeric field is transfered as a string to prevent floating point errors
                            int? value = fieldValue.Value switch
                            {
                                JsonElement x => x.ValueKind == JsonValueKind.Number ? x.GetInt32() : null,
                                int x => x,
                                null => null,
                                _ => throw new Exception("Incorrect type of value")
                            };

                            if (value.HasValue)
                            {
                                if (! writeableAccountIds.Contains(value.Value))
                                {
                                    throw new Exception("Cannot write to this account");
                                }
                            }

                            var previousValue = transaction.MetaAccountValues!.SingleOrDefault(x => x.FieldId == field.Id);
                            if (previousValue != null) {
                                transaction.MetaAccountValues!.Remove(previousValue);
                            }
                            if (value != null)
                            {
                                transaction.MetaAccountValues!.Add(new MetaAccount<Transaction>
                                {
                                    FieldId = field.Id,
                                    ValueId = value.Value,
                                    Value = null!
                                });
                            }
                            break;
                        }
                    case MetaFieldValueType.Transaction:
                        {
                            // The numeric field is transfered as a string to prevent floating point errors
                            int? value = fieldValue.Value switch
                            {
                                JsonElement x => x.ValueKind == JsonValueKind.Number ? x.GetInt32() : null,
                                int x => x,
                                null => null,
                                _ => throw new Exception("Incorrect type of value")
                            };

                            if (value.HasValue)
                            {
                                if (! writeableTransactionIds.Contains(value.Value))
                                {
                                    throw new Exception("Cannot write to this account");
                                }
                            }

                            var previousValue = transaction.MetaTransactionValues!.SingleOrDefault(x => x.FieldId == field.Id);
                            if (previousValue != null) {
                                transaction.MetaTransactionValues!.Remove(previousValue);
                            }
                            if (value != null)
                            {
                                transaction.MetaTransactionValues!.Add(new MetaTransaction<Transaction>
                                {
                                    FieldId = field.Id,
                                    ValueId = value.Value,
                                    Value = null!
                                });
                            }
                            break;
                        }
                    case MetaFieldValueType.Attachment:
                        // Only remove attachments. Attachments are added using a separate api
                        if (fieldValue.Value == null || ((fieldValue.Value as JsonElement?)?.ValueKind == JsonValueKind.Null))
                        {
                            var previousValue = transaction.MetaAttachmentValues!
                                .SingleOrDefault(x => x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                var previousAttachment = _context.Attachments.Where(x => x.Id == previousValue.ValueId).Single();
                                _attachment.DeleteAttachment(previousAttachment);
                                _context.Remove(previousValue.Value);
                                _context.Remove(previousValue);
                            }
                        }
                        break;
                    default:
                        throw new Exception("Unknown meta field value type");
                }
            }
        }
    }
}
