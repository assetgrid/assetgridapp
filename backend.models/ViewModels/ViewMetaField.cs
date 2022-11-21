using assetgrid_backend.models.MetaFields;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static assetgrid_backend.models.MetaFields.UserMetaField;

namespace assetgrid_backend.models.ViewModels
{
    public class ViewMetaField
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public MetaFieldType Type { get; set; }
        public MetaFieldValueType ValueType { get; set; }
        public FieldPermissions Permissions { get; set; }

        public ViewMetaField(int id, string name, string description, MetaFieldType type, MetaFieldValueType valueType, FieldPermissions permissions)
        {
            Id = id;
            Name = name;
            Description = description;
            Type = type;
            ValueType = valueType;
            Permissions = permissions;
        }
    }

    public class ViewSetMetaField
    {
        public required int MetaId { get; set; }
        public required object? Value { get; set; }
        public required MetaFieldValueType Type { get; set; }
    }

    public class ViewCreateMetaField
    {
        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters.")]
        public required string Name { get; set; }
        [MaxLength(50, ErrorMessage = "Description must be shorter than 250 characters.")]
        public required string Description { get; set; }
        public required MetaFieldType Type { get; set; }
        public required MetaFieldValueType ValueType { get; set; }
    }

    public class ViewMetaFieldValue
    {
        public required int MetaId { get; set; }
        public required string MetaName { get; set; }
        public required MetaFieldValueType Type { get; set; }
        public required object? Value { get; set; }
    }
}
