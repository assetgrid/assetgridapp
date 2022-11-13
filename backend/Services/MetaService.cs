﻿using assetgrid_backend.models.MetaFields;
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
                    .ThenInclude(x => x.Value)
                .Include(x => x.Field.TransactionMetaTransaction!.Where(xx => xx.ObjectId == transactionId))
                    .ThenInclude(x => x.Value)
                .Where(x => x.UserId == userId)
                .ToListAsync();

            return metaFields.Select(x => new ViewMetaFieldValue
            {
                MetaId = x.FieldId,
                MetaName = x.Field.Name,
                Type = x.Field.ValueType,
                Value = x.Field.ValueType switch
                {
                    MetaFieldValueType.TextLine => x.Field.TransactionMetaTextLine?.SingleOrDefault()?.Value,
                    MetaFieldValueType.TextLong => x.Field.TransactionMetaTextLong?.SingleOrDefault()?.Value,
                    MetaFieldValueType.Attachment => x.Field.TransactionMetaAttachment?.SingleOrDefault()?.Path,
                    MetaFieldValueType.Boolean => x.Field.TransactionMetaBoolean?.SingleOrDefault()?.Value,
                    MetaFieldValueType.Number => x.Field.TransactionMetaNumber?.SingleOrDefault()?.Value.ToString(),
                    MetaFieldValueType.Account => x.Field.TransactionMetaAccount?.SingleOrDefault()?.Value,
                    MetaFieldValueType.Transaction => x.Field.TransactionMetaTransaction?.SingleOrDefault()?.Value,
                    _ => throw new Exception($"Unknown meta type {x.Field.ValueType}")
                }
            }).ToList();
            #warning Return view accounts and view transactions rather than what is returned now
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
#warning Implement remaining types
                }
            }

#warning Consider throwing instead of failing silently
        }
    }
}
