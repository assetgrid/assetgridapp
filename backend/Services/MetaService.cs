using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.ViewModels;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.EntityFrameworkCore.Query.Internal;
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
    }

    public class MetaService : IMetaService
    {
        private readonly AssetgridDbContext _context;
        public MetaService(AssetgridDbContext context)
        {
            _context = context;
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
                .Include(x => x.Field.TransactionMetaBoolean!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaNumber!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaAccount!.Where(xx => xx.ObjectId == transactionId))
                .Include(x => x.Field.TransactionMetaTransaction!.Where(xx => xx.ObjectId == transactionId))
                .Where(x => x.UserId == userId)
                .Select(x => new MetaValue
                {
                    FieldId = x.Id,
                    FieldName = x.Field.Name,
                    FieldType = x.Field.ValueType,
                    TextShortValue = x.Field.TransactionMetaTextLine!.SingleOrDefault()!.Value,
                    TextLongValue = x.Field.TransactionMetaTextLong!.SingleOrDefault()!.Value,
                    AttachmentValue = x.Field.TransactionMetaAttachment!.SingleOrDefault()!.Path,
                    BooleanValue = x.Field.TransactionMetaBoolean!.SingleOrDefault()!.Value,
                    NumberValue = x.Field.TransactionMetaNumber!.SingleOrDefault()!.Value,
                    AccountValue = (ViewAccount?)null,
                    TransactionValue = (ViewTransaction?)null
                })
                .ToListAsync();

            #warning Implement it for transactions and accounts
            // Must be implemented separately as the query cannot be translated otherwise

            return metaFields.Select(x => new ViewMetaFieldValue
            {
                MetaId = x.FieldId,
                MetaName = x.FieldName,
                Type = x.FieldType,
                Value = x.FieldType switch
                {
                    MetaFieldValueType.TextLine => x.TextShortValue,
                    MetaFieldValueType.TextLong => x.TextLongValue,
                    MetaFieldValueType.Attachment => x.AttachmentValue,
                    MetaFieldValueType.Boolean => x.BooleanValue,
                    MetaFieldValueType.Number => x.NumberValue,
                    MetaFieldValueType.Account => x.AccountValue,
                    MetaFieldValueType.Transaction => x.TransactionValue,
                    _ => throw new Exception($"Unknown meta type {x.FieldType}")
                }
            }).ToList();
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
                if (! metaFields.TryGetValue(fieldValue.MetaId, out ViewMetaFieldValue? field))
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
#warning Implement remaining types
                }
            }

#warning Consider throwing instead of failing silently
        }
    }
}
