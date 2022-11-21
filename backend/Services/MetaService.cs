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
                        ? accounts[x.Field.TransactionMetaAccount.SingleOrDefault()!.ValueId]
                        : null,
                    MetaFieldValueType.Transaction => x.Field.TransactionMetaTransaction?.SingleOrDefault()?.ValueId != null
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
            var fieldIds = values.Select(x => x.MetaId).ToList();
            var metaFields = await _context.UserMetaFields
                .Where(x => x.UserId == userId)
                .Where(x => fieldIds.Contains(x.FieldId))
                .Select(x => new ViewMetaFieldValue
                {
                    MetaId = x.FieldId,
                    MetaName = "",
                    Type = x.Field.ValueType,
                    Value = null,
                }).ToDictionaryAsync(x => x.MetaId, x => x);

            foreach (var fieldValue in values)
            {
                if (!metaFields.TryGetValue(fieldValue.MetaId, out ViewMetaFieldValue? field))
                {
                    // Cannot set a field that doesn't exist
                    continue;
                }

                switch (field.Type)
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

                            var previousValue = _context.TransactionMetaTextLine.SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                if (value != null)
                                {
                                    previousValue.Value = value;
                                }
                                else
                                {
                                    _context.Remove(previousValue);
                                }
                            }
                            else if (value != null)
                            {
                                _context.TransactionMetaTextLine.Add(new MetaTextLine<Transaction>
                                {
                                    FieldId = fieldValue.MetaId,
                                    ObjectId = transactionId,
                                    Value = value
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

                            var previousValue = _context.TransactionMetaTextLong.SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                if (value != null)
                                {
                                    previousValue.Value = value;
                                }
                                else
                                {
                                    _context.Remove(previousValue);
                                }
                            }
                            else if (value != null)
                            {
                                _context.TransactionMetaTextLong.Add(new MetaTextLong<Transaction>
                                {
                                    FieldId = fieldValue.MetaId,
                                    ObjectId = transactionId,
                                    Value = value
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

                            var previousValue = _context.TransactionMetaBoolean.SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                if (value != null && value.Value == true)
                                {
                                    previousValue.Value = value.Value;
                                }
                                else
                                {
                                    _context.Remove(previousValue);
                                }
                            }
                            else if (value != null && value.Value == true)
                            {
                                _context.TransactionMetaBoolean.Add(new MetaBoolean<Transaction>
                                {
                                    FieldId = fieldValue.MetaId,
                                    ObjectId = transactionId,
                                    Value = value.Value
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

                            var previousValue = _context.TransactionMetaNumber.SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                if (value != null)
                                {
                                    previousValue.Value = value.Value;
                                }
                                else
                                {
                                    _context.Remove(previousValue);
                                }
                            }
                            else if (value != null)
                            {
                                _context.TransactionMetaNumber.Add(new MetaNumber<Transaction>
                                {
                                    FieldId = fieldValue.MetaId,
                                    ObjectId = transactionId,
                                    Value = value.Value
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
                                var canWrite = await _context.UserAccounts
                                    .Where(account => account.UserId == userId && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                                    .AnyAsync(account => account.Id == value);
                                if (! canWrite)
                                {
                                    throw new Exception("Cannot write to this account");
                                }
                            }

                            var previousValue = _context.TransactionMetaAccount.SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                if (value != null)
                                {
                                    previousValue.ValueId = value.Value;
                                }
                                else
                                {
                                    _context.Remove(previousValue);
                                }
                            }
                            else if (value != null)
                            {
                                _context.TransactionMetaAccount.Add(new MetaAccount<Transaction>
                                {
                                    FieldId = fieldValue.MetaId,
                                    ObjectId = transactionId,
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
                                var writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
                                var canWrite = await _context.Transactions
                                    .Where(transaction => transaction.SourceAccount.Users.Any(x => x.UserId == userId && writePermissions.Contains(x.Permissions)) ||
                                        transaction.DestinationAccount.Users.Any(x => x.UserId == userId && writePermissions.Contains(x.Permissions)))
                                    .AnyAsync(account => account.Id == value);
                                if (!canWrite)
                                {
                                    throw new Exception("Cannot reference this account due to insufficient permissions");
                                }
                            }

                            var previousValue = _context.TransactionMetaTransaction.SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                if (value != null)
                                {
                                    previousValue.ValueId = value.Value;
                                }
                                else
                                {
                                    _context.Remove(previousValue);
                                }
                            }
                            else if (value != null)
                            {
                                _context.TransactionMetaTransaction.Add(new MetaTransaction<Transaction>
                                {
                                    FieldId = fieldValue.MetaId,
                                    ObjectId = transactionId,
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
                            var previousValue = _context.TransactionMetaAttachment
                                .Include(x => x.Value)
                                .SingleOrDefault(x => x.ObjectId == transactionId && x.FieldId == fieldValue.MetaId);
                            if (previousValue != null)
                            {
                                _attachment.DeleteAttachment(previousValue.Value);
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
