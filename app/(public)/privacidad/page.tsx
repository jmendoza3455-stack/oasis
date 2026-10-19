import type { Metadata } from "next";
import { venueInfo } from "@/server/public/venue-info";

export const metadata: Metadata = {
  title: "Aviso de privacidad y cookies",
  description: "Cómo tratamos tus datos personales conforme a la Ley N.º 29733.",
  alternates: { canonical: "/privacidad" },
};

export default async function PrivacyPage() {
  const info = await venueInfo();
  const email = info.privacyEmail ?? "[COMPLETAR correo]";
  return (
    <article className="[&_h2]:font-display [&_p]:text-muted-foreground mx-auto grid max-w-3xl gap-4 px-4 py-12 [&_h2]:mt-6 [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc">
      <p className="rounded-md border border-dashed p-3 text-xs">
        BORRADOR por validar con asesoría legal antes del lanzamiento (OASIS.md §11.7).
      </p>
      <h1 className="font-display text-4xl">Aviso de privacidad y cookies</h1>
      <h2>Responsable</h2>
      <p>
        SAWA – Gestión Comercial S.A.C., RUC {info.ruc ?? "[COMPLETAR]"}, con domicilio en{" "}
        {info.companyAddress ?? "[COMPLETAR]"}, operadora de Oasis Pachacámac. Contacto para datos
        personales: {email}.
      </p>
      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          Nombre, teléfono, correo y datos de tu evento: para responder tu consulta, cotizar y
          gestionar tu reserva.
        </li>
        <li>Datos de facturación (RUC, razón social): para emitir comprobantes.</li>
        <li>
          Origen de la visita (campaña, anuncio) y uso del sitio: para medir y mejorar nuestra
          comunicación.
        </li>
        <li>Envío de novedades y promociones: solo si lo autorizas por separado.</li>
      </ul>
      <h2>Banco de datos</h2>
      <p>
        Los datos se almacenan en el banco de datos de clientes de SAWA, inscrito ante la Autoridad
        Nacional de Protección de Datos Personales
        {info.anpdCode
          ? ` con código ${info.anpdCode}`
          : " [COMPLETAR código — inscripción en trámite]"}
        .
      </p>
      <h2>Encargados y transferencias</h2>
      <p>
        Usamos proveedores tecnológicos que actúan como encargados del tratamiento: alojamiento y
        base de datos (Vercel, Supabase), correo (Resend) y medición publicitaria (Google, Meta),
        algunos con servidores fuera del Perú.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de información, acceso, rectificación, cancelación y oposición
        escribiendo a {email}, y acudir a la Autoridad Nacional de Protección de Datos Personales.
      </p>
      <h2>Cookies</h2>
      <p>
        Usamos almacenamiento necesario para el funcionamiento del sitio. Las cookies de medición
        (Google Analytics, Google Ads y Meta) solo se activan si las aceptas en el aviso de cookies.
        Puedes cambiar tu decisión borrando los datos del sitio en tu navegador.
      </p>
      <h2>Conservación</h2>
      <p>
        Conservamos los datos mientras dure la relación comercial y los plazos legales aplicables.
      </p>
    </article>
  );
}
