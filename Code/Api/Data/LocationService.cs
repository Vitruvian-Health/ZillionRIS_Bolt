using System;
using System.Linq;

using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class LocationService : ZillionRisBaseTask 
    {
        [TaskAction("retrieve")]
        public object Execute()
        {
            if (this.Context.User == null)
                throw new ApplicationException("Client has not been authenticated.");

            var query = this.Context.DataContext.Rooms
                .Where(item => item.Department != null)
                .Where(item => item.roo_DateTimeInactive == null || item.roo_DateTimeInactive > DateTime.Today);

            var locations = query
                .Select(item => item.Department.Location.loc_LocationID)
                .Distinct()
                .Join(this.Context.DataContext.Locations, id => id, locations1 => locations1.loc_LocationID, (id, locations1) => locations1)
                .Select(item => new
                {
                    ID = item.loc_LocationID,
                    Name = item.loc_LocationName,
                    Description = item.loc_LocationDescription,
                }).ToArray();

            var departments = query
                .Select(item => item.Department.dep_DepartmentID).Distinct()
                .Join(this.Context.DataContext.Departments, id => id, locations1 => locations1.dep_DepartmentID, (id, locations1) => locations1)
                .Select(item => new
                {
                    LocationID = item.Location.loc_LocationID,
                    ID = item.dep_DepartmentID,
                    Name = item.dep_DepartmentName,
                    Description = item.dep_DepartmentDescription,
                }).ToArray();

            var modalities = query
                .SelectMany(item => item.Modalities)
                .Distinct()
                .Select(item => new
                {
                    LocationIDs = item.Rooms.Select(modalityRoom => modalityRoom.Department.Location.loc_LocationID).Distinct(),
                    DepartmentIDs = item.Rooms.Select(modalityRoom => modalityRoom.Department.dep_DepartmentID).Distinct(),
                    ID = item.mod_ModalityID,
                    Name = item.mod_ModalityName,
                    Code = item.mod_ModalityCode,
                    Description = item.mod_ModalityDescription,
                }).ToArray();

            var modalityTypes = query
                .SelectMany(item => item.Modalities)
                .Where(item => item.ModalityType != null)
                .Select(item => item.ModalityType)
                .Distinct()
                .Select(item => new
                {
                    ID = item.modtyp_ModalityTypeID,
                    Name = item.modtyp_ModalityTypeName,
                    LocationIDs = item.Modalities.SelectMany(roo => roo.Rooms).Select(dep => dep.Department.Location.loc_LocationID).Distinct()
                }).ToArray();

            var rooms = query
                .Select(item => new
                {
                    LocationID = item.Department.Location.loc_LocationID,
                    DepartmentID = item.Department.dep_DepartmentID,
                    ID = item.roo_RoomID,
                    Name = item.roo_RoomName,
                    ResourceID = item.Resources.Any() ? item.Resources.Select(x=>x.res_ResourceID).FirstOrDefault() : 0,
                    Description = item.roo_RoomDescription,
                }).ToArray();

            var requesterLocations = query
                .SelectMany(item => item.Department.Location.RequesterLocations)
                .Distinct()
                .Select(b => new
                {
                    ID = b.reqloc_RequesterLocationID,
                    Name = b.reqloc_Code,
                    Description = b.reqloc_Description,
                    LocationID = b.Location.loc_LocationID
                }).ToArray();

            var referralTypes = this.Context.DataContext.ReferralTypes
                .Distinct()
                .Select(b => new
                {
                    ID = b.reftyp_ReferralTypeID,
                    Name = b.reftyp_ReferralTypeName,
                    Description = b.reftyp_ReferralTypeDescription
                }).ToArray();

            return new
                        {
                            Locations = locations,
                            Departments = departments,
                            Modalities = modalities,
                            ModalityTypes = modalityTypes,
                            Rooms = rooms,
                            RequesterLocations = requesterLocations,
                            ReferralTypes = referralTypes
                        };
        }
    }
}
