using System.Linq;

using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class FunctionSpecialisationService : ZillionRisBaseTask 
    {
        [TaskAction("retrieve")]
        public object funcspecQuery()
        {
            var functionSpecialisations = this.Context.DataContext
                .FunctionSpecialisations
                .ToArray() //Execute the query before projecting, otherwise EF tries to translate the Join method into SQL...
                .Select(item => new
                {
                    ID = item.funspe_FunctionSpecialisationID,
                    Code = item.funspe_NationalCode,
                    Name = item.funspe_Name                    
                });

            return new
                      {
                          Specialisations = functionSpecialisations
                      };               
        }
    }
}