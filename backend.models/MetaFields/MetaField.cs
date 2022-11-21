using assetgrid_backend.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace assetgrid_backend.models.MetaFields
{
    public class MetaField
    {
        public int Id { get; set; }
        [MaxLength(50)]
        public required string Name { get; set; }
        [MaxLength(250)]
        public required string Description { get; set; }
        public MetaFieldType Type { get; set; }
        public MetaFieldValueType ValueType { get; set; }

        public virtual List<UserMetaField>? Users { get; set; }

        public virtual List<MetaTextLine<Transaction>>? TransactionMetaTextLine { get; set; }
        public virtual List<MetaTextLong<Transaction>>? TransactionMetaTextLong { get; set; }
        public virtual List<MetaAttachment<Transaction>>? TransactionMetaAttachment { get; set; }
        public virtual List<MetaBoolean<Transaction>>? TransactionMetaBoolean { get; set; }
        public virtual List<MetaNumber<Transaction>>? TransactionMetaNumber { get; set; }
        public virtual List<MetaAccount<Transaction>>? TransactionMetaAccount { get; set; }
        public virtual List<MetaTransaction<Transaction>>? TransactionMetaTransaction { get; set; }
    }

    public class UserMetaField
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public required virtual User User { get; set; }
        public int FieldId { get; set; }
        public required virtual MetaField Field { get; set; }
        public FieldPermissions Permissions { get; set; }

        public enum FieldPermissions
        {
            /// <summary>
            /// The user can see and modify the value of this field, but cannot delete the field itself
            /// </summary>
            User,
            /// <summary>
            /// The user is the owner of the field and can delete it, which will delete all values for all users
            /// </summary>
            Owner
        }
    }

    public enum MetaFieldValueType
    {
        TextLine,
        TextLong,
        Transaction,
        Account,
        Attachment,
        Boolean,
        Number
    }

    public enum MetaFieldType
    {
        Transaction,
        Account
    }
}
