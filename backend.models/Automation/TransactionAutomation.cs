using assetgrid_backend.models.Search;
using assetgrid_backend.Models;
using System;
using System.Collections.Generic;
using System.Formats.Asn1;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using assetgrid_backend.Models.ViewModels;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Logging.Abstractions;
using assetgrid_backend.models.ViewModels;

namespace assetgrid_backend.models.Automation
{
    public class UserTransactionAutomation
    {
        public int Id { get; set; }
        public int TransactionAutomationId { get; set; }
        public required virtual TransactionAutomation TransactionAutomation { get; set; }
        public int UserId { get; set; }
        public required virtual User User { get; set; }
        public bool Enabled { get; set; }

        public AutomationPermissions Permissions { get; set; }

        public enum AutomationPermissions
        {
            Read,
            Modify
        }
    }

    public class TransactionAutomation
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public required string Name { get; set; }

        [MaxLength(250)]
        public required string Description { get; set; }
        public bool TriggerOnCreate { get; set; }
        public bool TriggerOnModify { get; set; }
        public required SearchGroup Query { get; set; }
        public required List<TransactionAutomationAction> Actions { get; set; }
    }

    [JsonConverter(typeof(TransactionAutomationActionConverter))]
    public abstract class TransactionAutomationAction
    {
        public abstract string Key { get; }
        public abstract int Version { get; }
    }

    [AttributeUsage(AttributeTargets.Class, Inherited = false)]
    public class TransactionActionAttribute : Attribute
    {
        public int Version { get; set; }
        public string Key { get; set; }
        public TransactionActionAttribute (int version, string key)
        {
            Version = version;
            Key = key;
        }
    }

    #region Actions

    [TransactionAction(1, "set-timestamp")]
    public class ActionSetTimestamp : TransactionAutomationAction
    {
        public override string Key => "set-timestamp";
        public override int Version => 1;
        public DateTime Value { get; set; }
    }

    [TransactionAction(1, "set-description")]
    public class ActionSetDescription : TransactionAutomationAction
    {
        public override string Key => "set-description";
        public override int Version => 1;
        public required string Value { get; set; }
    }

    [TransactionAction(1, "set-amount")]
    public class ActionSetAmount : TransactionAutomationAction
    {
        public override string Key => "set-amount";
        public override int Version => 1;
        public long Value { get; set; }
        public string ValueString { get => Value.ToString(); set => Value = long.Parse(value); }
    }

    [TransactionAction(1, "set-account")]
    public class ActionSetAccount : TransactionAutomationAction
    {
        public override string Key => "set-account";
        public override int Version => 1;
        public int? Value { get; set; }
        public required string Account { get; set; }

        private async Task<UserAccount?> ValueAccount (AssetgridDbContext context, User user)
        {
            if (!Value.HasValue)
            {
                return null;
            }

            var writePermissions = new[] { UserAccountPermissions.ModifyTransactions, UserAccountPermissions.All };
            var result = await context.UserAccounts
                .Include(x => x.Account)
                .SingleOrDefaultAsync(x => x.UserId == user.Id && x.AccountId == Value && writePermissions.Contains(x.Permissions));

            if (result == null)
            {
                throw new Exception("User does not have permission to write to this account");
            }

            return result;
        }
    }

    [TransactionAction(1, "set-category")]
    public class ActionSetCategory : TransactionAutomationAction
    {
        public override string Key => "set-category";
        public override int Version => 1;
        public required string Value { get; set; }
    }

    [TransactionAction(1, "set-lines")]
    public class ActionSetLines : TransactionAutomationAction
    {
        public override string Key => "set-lines";
        public override int Version => 1;
        public required List<ViewTransactionLine> Value { get; set; }
    }

    [TransactionAction(1, "delete")]
    public class ActionDelete : TransactionAutomationAction
    {
        public override string Key => "delete";
        public override int Version => 1;
    }

    [TransactionAction(1, "set-meta-value")]
    public class ActionSetMetaValue : TransactionAutomationAction
    {
        public override string Key => "set-meta-value";
        public override int Version => 1;
        public required int FieldId { get; set; }
        public required object? Value { get; set; }
    }

    #endregion

    #region JSON deserializers

    public class TransactionAutomationActionConverter : JsonConverter<TransactionAutomationAction>
    {
        public override TransactionAutomationAction? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var readerCopy = reader;
            var version = JsonSerializer.Deserialize<VersionStruct?>(ref readerCopy, options)!;

            // Get all implementations of TransactionAction
            var types = Assembly.GetAssembly(typeof(TransactionAutomationAction))!
                .GetTypes()
                .Where(myType => myType.IsClass && !myType.IsAbstract && myType.IsSubclassOf(typeof(TransactionAutomationAction)))
                .Select(myType =>
                {
                    var attribute = (TransactionActionAttribute)Attribute.GetCustomAttribute(myType, typeof(TransactionActionAttribute))!;
                    return new
                    {
                        key = attribute.Key,
                        version = attribute.Version,
                        type = myType
                    };
                })
                .Where(myType => myType.key == version.Value.Key)
                .OrderByDescending(myType => myType.version);
            
            var type = types.FirstOrDefault(myType => version?.Version == null || myType.version == version.Value.Version)?.type;
            if (type == null)
            {
                throw new Exception("Unable to parse JSON");
            }

            #warning If more versions are imlpemented, automatically upgrade to the newest
            var result = (TransactionAutomationAction)JsonSerializer.Deserialize(ref reader, type, options)!;
            return result;
        }

        public override void Write(Utf8JsonWriter writer, TransactionAutomationAction value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize(writer, value, value.GetType(), options);
        }

        private struct VersionStruct
        {
            public int? Version { get; set; }
            public string Key { get; set; }
        }
    }

    #endregion
}
